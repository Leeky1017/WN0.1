import type { ConstraintRule, ConstraintViolation, IJudge, JudgeResult } from './types';

import { CodeJudge } from './code-judge';
import { IpcError, judgeOps } from '../ipc';
import { buildCoveragePrompt } from './prompts/coverage';
import { buildTonePrompt } from './prompts/tone';

export type LlmJudgeOptions = {
  codeJudge: CodeJudge;
  timeoutMs?: number;
};

type ToneResponse = {
  pass: boolean;
  reason?: string;
};

type CoverageResponse = {
  pass: boolean;
  missing?: string[];
  reason?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function safeParseJson(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asToneResponse(value: unknown): ToneResponse | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.pass !== 'boolean') return null;
  const reason = typeof obj.reason === 'string' ? obj.reason.trim() : undefined;
  return { pass: obj.pass, reason };
}

function asCoverageResponse(value: unknown): CoverageResponse | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.pass !== 'boolean') return null;
  const reason = typeof obj.reason === 'string' ? obj.reason.trim() : undefined;
  const missing =
    Array.isArray(obj.missing) ? obj.missing.map((item) => (typeof item === 'string' ? item : String(item))).map((s) => s.trim()).filter(Boolean) : undefined;
  return { pass: obj.pass, missing, reason };
}

function violation(rule: ConstraintRule, message: string, patch: Partial<ConstraintViolation> = {}): ConstraintViolation {
  return {
    ruleId: rule.id,
    type: rule.type,
    level: rule.level,
    message,
    ...patch,
  };
}

function getString(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item : String(item))).map((item) => item.trim()).filter(Boolean);
}

export class LlmJudge implements IJudge {
  private codeJudge: CodeJudge;
  private timeoutMs: number;

  constructor(options: LlmJudgeOptions) {
    this.codeJudge = options.codeJudge;
    this.timeoutMs = typeof options.timeoutMs === 'number' && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? Math.floor(options.timeoutMs) : 3000;
  }

  async check(text: string, rules: ConstraintRule[]): Promise<JudgeResult> {
    const startedAt = Date.now();
    const base = await this.codeJudge.check(text, rules);

    const enabledRules = rules.filter((rule) => rule.enabled);
    const l2Rules = enabledRules.filter((rule) => rule.type === 'tone' || rule.type === 'coverage');

    if (l2Rules.length === 0) {
      return { ...base, checkedAt: nowIso(), durationMs: Date.now() - startedAt, l2Passed: true };
    }

    const l2Violations: ConstraintViolation[] = [];
    let l2Passed = true;

    for (const rule of l2Rules) {
      try {
        if (rule.type === 'tone') {
          const tone = getString(rule.config.tone);
          if (!tone) continue;
          const prompt = buildTonePrompt(tone, text);
          const { output } = await judgeOps.promptL2({ prompt, timeoutMs: this.timeoutMs, maxTokens: 256, temperature: 0.2 });
          const parsed = asToneResponse(safeParseJson(output));
          if (!parsed) throw new Error('Invalid L2 JSON output');
          if (!parsed.pass) {
            l2Violations.push(violation(rule, parsed.reason ? `语气不符合：${parsed.reason}` : '语气不符合要求'));
          }
          continue;
        }

        const points = getStringArray(rule.config.points);
        if (points.length === 0) continue;
        const prompt = buildCoveragePrompt(points, text);
        const { output } = await judgeOps.promptL2({ prompt, timeoutMs: this.timeoutMs, maxTokens: 256, temperature: 0.2 });
        const parsed = asCoverageResponse(safeParseJson(output));
        if (!parsed) throw new Error('Invalid L2 JSON output');
        if (!parsed.pass) {
          const missing = parsed.missing?.length ? parsed.missing : undefined;
          l2Violations.push(
            violation(
              rule,
              missing ? `覆盖率不足：未覆盖 ${missing.join('、')}` : parsed.reason ? `覆盖率不足：${parsed.reason}` : '覆盖率不足：存在未覆盖要点',
              missing ? { suggestion: '补充缺失要点后再提交' } : { suggestion: '补充缺失要点后再提交' }
            )
          );
        }
      } catch (error) {
        l2Passed = false;
        const message =
          error instanceof IpcError
            ? error.code === 'MODEL_NOT_READY'
              ? 'L2 模型未就绪，已降级为仅使用 L1 检查'
              : error.code === 'TIMEOUT'
                ? 'L2 推理超时，已降级为仅使用 L1 检查'
                : `L2 检查失败，已降级为仅使用 L1 检查（${error.code}）`
            : 'L2 检查失败，已降级为仅使用 L1 检查';
        l2Violations.push(
          violation(
            rule,
            message,
            {
              level: 'warning',
            }
          )
        );
        break;
      }
    }

    const violations = [...base.violations, ...l2Violations];
    const passed = violations.every((v) => v.level !== 'error');
    const finalL2Passed = l2Passed && l2Violations.every((v) => v.level !== 'error');

    return {
      passed,
      violations,
      l1Passed: base.l1Passed,
      l2Passed: finalL2Passed,
      checkedAt: nowIso(),
      durationMs: Date.now() - startedAt,
    };
  }
}
