import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { clipboardOps, judgeOps } from '../../lib/ipc';
import { useConstraintsStore } from '../../stores/constraintsStore';

import type { ConstraintsConfig, JudgeModelState } from '../../types/ipc';
import type { ConstraintLevel, ConstraintRule, ConstraintType } from '../../types/constraints';

type Scope = 'global' | 'project';

function cloneConfig(config: ConstraintsConfig): ConstraintsConfig {
  return JSON.parse(JSON.stringify(config)) as ConstraintsConfig;
}

function buildRuleId(scope: Scope, type: ConstraintType, projectId?: string): string {
  if (scope === 'project') return `project:${projectId ?? 'unknown'}:${type}`;
  return `global:${type}`;
}

function ensureRule(rules: ConstraintRule[], scope: Scope, type: ConstraintType, projectId?: string): ConstraintRule {
  const existing = rules.find((r) => r.type === type);
  if (existing) return existing;
  const base = scope === 'project' ? { scope, projectId } : { scope };
  const level: ConstraintLevel = type === 'forbidden_words' ? 'error' : 'warning';
  const config =
    type === 'forbidden_words'
      ? { words: [] }
      : type === 'word_count'
        ? { min: undefined, max: undefined }
        : type === 'format'
          ? { mode: 'list_only' }
          : type === 'terminology'
            ? { terms: [] }
            : type === 'tone'
              ? { tone: '' }
              : { points: [] };

  const next: ConstraintRule = {
    id: buildRuleId(scope, type, projectId),
    type,
    enabled: false,
    config,
    level,
    ...base,
  };
  rules.push(next);
  return next;
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function toForbiddenWordsText(rule: ConstraintRule): string {
  const words = Array.isArray(rule.config.words) ? rule.config.words : [];
  return words.map((w) => (typeof w === 'string' ? w : String(w))).map((w) => w.trim()).filter(Boolean).join('\n');
}

function setForbiddenWords(rule: ConstraintRule, text: string) {
  const words = Array.from(new Set(parseLines(text)));
  rule.config = { ...rule.config, words };
}

function toTerminologyText(rule: ConstraintRule): string {
  const terms = Array.isArray(rule.config.terms) ? rule.config.terms : [];
  const lines: string[] = [];
  for (const raw of terms) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    const canonical = typeof obj.canonical === 'string' ? obj.canonical.trim() : '';
    if (!canonical) continue;
    const aliases = Array.isArray(obj.aliases) ? obj.aliases : [];
    const normalized = aliases.map((a) => (typeof a === 'string' ? a : String(a))).map((a) => a.trim()).filter(Boolean);
    if (normalized.length === 0) continue;
    lines.push(`${canonical}=${normalized.join(',')}`);
  }
  return lines.join('\n');
}

function setTerminology(rule: ConstraintRule, text: string) {
  const lines = parseLines(text);
  const terms: Array<{ canonical: string; aliases: string[] }> = [];
  for (const line of lines) {
    const [left, right] = line.split('=');
    const canonical = (left ?? '').trim();
    const aliases = (right ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => s !== canonical);
    if (!canonical || aliases.length === 0) continue;
    terms.push({ canonical, aliases: Array.from(new Set(aliases)) });
  }
  rule.config = { ...rule.config, terms };
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getNumberOrEmpty(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return String(Number(value));
  return '';
}

function setNumberConfig(rule: ConstraintRule, key: 'min' | 'max', value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    rule.config = { ...rule.config, [key]: undefined };
    return;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return;
  rule.config = { ...rule.config, [key]: Math.floor(num) };
}

export function ConstraintsPanel() {
  const { t } = useTranslation();

  const isLoading = useConstraintsStore((s) => s.isLoading);
  const loadError = useConstraintsStore((s) => s.loadError);
  const storedConfig = useConstraintsStore((s) => s.config);
  const load = useConstraintsStore((s) => s.load);
  const save = useConstraintsStore((s) => s.save);

  const [scope, setScope] = useState<Scope>('global');
  const [projectId, setProjectId] = useState('');
  const [draft, setDraft] = useState<ConstraintsConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modelState, setModelState] = useState<JudgeModelState | null>(null);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const effectiveConfig = draft ?? storedConfig;
  const dirty = draft !== null;

  useEffect(() => {
    let mounted = true;
    judgeOps.getModelState().then((state) => mounted && setModelState(state)).catch(() => undefined);

    const api = window.writenow;
    const handler = (next: unknown) => {
      if (!mounted) return;
      const obj = next as JudgeModelState;
      if (!obj || typeof obj !== 'object' || typeof obj.status !== 'string') return;
      setModelState(obj);
    };

    try {
      api?.on?.('judge:modelStateChanged', handler);
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
      try {
        api?.off?.('judge:modelStateChanged', handler);
      } catch {
        // ignore
      }
    };
  }, []);

  const scopeConfig = useMemo(() => {
    if (scope === 'global') return effectiveConfig.global;
    const id = projectId.trim();
    if (!id) return null;
    if (effectiveConfig.projects[id]) return effectiveConfig.projects[id];
    return { l2Enabled: effectiveConfig.global.l2Enabled, rules: [] };
  }, [effectiveConfig.global, effectiveConfig.projects, projectId, scope]);

  const scopeRules = useMemo(() => {
    if (!scopeConfig) return null;
    const rules = [...scopeConfig.rules];
    ensureRule(rules, scope, 'forbidden_words', projectId.trim() || undefined);
    ensureRule(rules, scope, 'word_count', projectId.trim() || undefined);
    ensureRule(rules, scope, 'format', projectId.trim() || undefined);
    ensureRule(rules, scope, 'terminology', projectId.trim() || undefined);
    ensureRule(rules, scope, 'tone', projectId.trim() || undefined);
    ensureRule(rules, scope, 'coverage', projectId.trim() || undefined);
    return rules;
  }, [projectId, scope, scopeConfig]);

  function updateScope(updater: (next: ConstraintsScopeConfig) => void) {
    setDraft((prev) => {
      const next = cloneConfig(prev ?? storedConfig);
      if (scope === 'global') {
        updater(next.global);
        return next;
      }
      const id = projectId.trim();
      if (!id) return next;
      const existing = next.projects[id] ?? { l2Enabled: next.global.l2Enabled, rules: [] };
      updater(existing);
      next.projects[id] = existing;
      return next;
    });
    setMessage(null);
  }

  async function handleSave() {
    setMessage(null);
    try {
      if (!draft) return;
      await save(draft);
      setDraft(null);
      setMessage(t('settings.constraints.saved'));
    } catch {
      setMessage(t('settings.constraints.saveFailed'));
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(t('common.copied'));
    } catch {
      try {
        await clipboardOps.writeText(text);
        setMessage(t('common.copied'));
      } catch {
        setMessage(t('settings.constraints.copyFailed'));
      }
    }
  }

  const forbiddenRule = scopeRules ? ensureRule(scopeRules, scope, 'forbidden_words', projectId.trim() || undefined) : null;
  const wordCountRule = scopeRules ? ensureRule(scopeRules, scope, 'word_count', projectId.trim() || undefined) : null;
  const formatRule = scopeRules ? ensureRule(scopeRules, scope, 'format', projectId.trim() || undefined) : null;
  const terminologyRule = scopeRules ? ensureRule(scopeRules, scope, 'terminology', projectId.trim() || undefined) : null;
  const toneRule = scopeRules ? ensureRule(scopeRules, scope, 'tone', projectId.trim() || undefined) : null;

  const canEdit = scope === 'global' || Boolean(projectId.trim());

  return (
    <div data-testid="constraints-panel" className="wn-elevated rounded-md p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[12px] text-[var(--text-secondary)]">{t('settings.constraints.title')}</div>
        <button
          type="button"
          onClick={() => handleSave().catch(() => undefined)}
          disabled={!dirty || isLoading || !canEdit}
          data-testid="constraints-save"
          className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[12px] transition-colors disabled:opacity-60"
        >
          {t('settings.constraints.save')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-3 text-[12px] text-[var(--text-tertiary)]">
        <label className="flex items-center gap-2">
          <input type="radio" name="constraint-scope" checked={scope === 'global'} onChange={() => setScope('global')} />
          {t('settings.constraints.scope.global')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="constraint-scope" checked={scope === 'project'} onChange={() => setScope('project')} />
          {t('settings.constraints.scope.project')}
        </label>

        {scope === 'project' && (
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder={t('settings.constraints.projectIdPlaceholder')}
            className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]"
          />
        )}
      </div>

      {scopeConfig && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={scopeConfig.l2Enabled}
                onChange={(e) => updateScope((next) => (next.l2Enabled = e.target.checked))}
                disabled={!canEdit}
              />
              {t('settings.constraints.l2Enabled')}
            </label>

            <button
              type="button"
              onClick={() => judgeOps.ensureModel().catch(() => undefined)}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
              disabled={!scopeConfig.l2Enabled}
            >
              {t('settings.constraints.model.ensure')}
            </button>
          </div>

          {modelState?.status === 'downloading' && modelState.progress && (
            <div>
              <div className="text-[11px] text-[var(--text-tertiary)] mb-1">
                {t('settings.constraints.model.downloading')} {Math.round(modelState.progress.percent)}%
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded">
                <div
                  className="h-1.5 bg-[var(--accent-primary)] rounded"
                  style={{ width: `${Math.max(0, Math.min(100, modelState.progress.percent))}%` }}
                />
              </div>
            </div>
          )}

          {modelState?.status === 'error' && modelState.error && (
            <div className="text-[11px] text-red-300">
              {t('settings.constraints.model.error')}: {modelState.error.message}
            </div>
          )}

          {forbiddenRule && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={forbiddenRule.enabled}
                    onChange={(e) => updateScope((next) => (ensureRule(next.rules, scope, 'forbidden_words', projectId.trim() || undefined).enabled = e.target.checked))}
                    disabled={!canEdit}
                  />
                  {t('settings.constraints.forbiddenWords')}
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(toForbiddenWordsText(forbiddenRule)).catch(() => undefined)}
                  className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                >
                  {t('settings.constraints.export')}
                </button>
              </div>
              <textarea
                value={toForbiddenWordsText(forbiddenRule)}
                onChange={(e) =>
                  updateScope((next) => setForbiddenWords(ensureRule(next.rules, scope, 'forbidden_words', projectId.trim() || undefined), e.target.value))
                }
                placeholder={t('settings.constraints.forbiddenWordsPlaceholder')}
                className="w-full h-24 p-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-mono"
                disabled={!canEdit}
              />
            </div>
          )}

          {wordCountRule && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={wordCountRule.enabled}
                  onChange={(e) => updateScope((next) => (ensureRule(next.rules, scope, 'word_count', projectId.trim() || undefined).enabled = e.target.checked))}
                  disabled={!canEdit}
                />
                {t('settings.constraints.wordCount')}
              </label>
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
                <span>{t('settings.constraints.wordCountMin')}</span>
                <input
                  value={getNumberOrEmpty(wordCountRule.config.min)}
                  onChange={(e) =>
                    updateScope((next) => setNumberConfig(ensureRule(next.rules, scope, 'word_count', projectId.trim() || undefined), 'min', e.target.value))
                  }
                  className="h-7 w-20 px-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]"
                  disabled={!canEdit}
                />
                <span>{t('settings.constraints.wordCountMax')}</span>
                <input
                  value={getNumberOrEmpty(wordCountRule.config.max)}
                  onChange={(e) =>
                    updateScope((next) => setNumberConfig(ensureRule(next.rules, scope, 'word_count', projectId.trim() || undefined), 'max', e.target.value))
                  }
                  className="h-7 w-20 px-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]"
                  disabled={!canEdit}
                />
              </div>
            </div>
          )}

          {formatRule && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={formatRule.enabled}
                  onChange={(e) => updateScope((next) => (ensureRule(next.rules, scope, 'format', projectId.trim() || undefined).enabled = e.target.checked))}
                  disabled={!canEdit}
                />
                {t('settings.constraints.format.title')}
              </label>
              <select
                value={getString(formatRule.config.mode) || 'list_only'}
                onChange={(e) =>
                  updateScope((next) => {
                    const rule = ensureRule(next.rules, scope, 'format', projectId.trim() || undefined);
                    rule.config = { ...rule.config, mode: e.target.value };
                  })
                }
                className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]"
                disabled={!canEdit}
              >
                <option value="list_only">{t('settings.constraints.format.listOnly')}</option>
                <option value="paragraph_only">{t('settings.constraints.format.paragraphOnly')}</option>
              </select>
            </div>
          )}

          {terminologyRule && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={terminologyRule.enabled}
                  onChange={(e) => updateScope((next) => (ensureRule(next.rules, scope, 'terminology', projectId.trim() || undefined).enabled = e.target.checked))}
                  disabled={!canEdit}
                />
                {t('settings.constraints.terminology')}
              </label>
              <textarea
                value={toTerminologyText(terminologyRule)}
                onChange={(e) =>
                  updateScope((next) => setTerminology(ensureRule(next.rules, scope, 'terminology', projectId.trim() || undefined), e.target.value))
                }
                placeholder={t('settings.constraints.terminologyPlaceholder')}
                className="w-full h-24 p-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-mono"
                disabled={!canEdit}
              />
            </div>
          )}

          {toneRule && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={toneRule.enabled}
                  onChange={(e) => updateScope((next) => (ensureRule(next.rules, scope, 'tone', projectId.trim() || undefined).enabled = e.target.checked))}
                  disabled={!canEdit || !scopeConfig.l2Enabled}
                />
                {t('settings.constraints.tone')}
              </label>
              <input
                value={getString(toneRule.config.tone)}
                onChange={(e) =>
                  updateScope((next) => {
                    const rule = ensureRule(next.rules, scope, 'tone', projectId.trim() || undefined);
                    rule.config = { ...rule.config, tone: e.target.value };
                  })
                }
                placeholder={t('settings.constraints.tonePlaceholder')}
                className="h-7 w-full px-2 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]"
                disabled={!canEdit || !scopeConfig.l2Enabled}
              />
            </div>
          )}
        </div>
      )}

      {!scopeConfig && scope === 'project' && (
        <div className="text-[11px] text-[var(--text-tertiary)]">{t('settings.constraints.projectIdHint')}</div>
      )}

      {(message || loadError) && (
        <div className="mt-3 text-[12px] text-[var(--text-tertiary)]">{message ? message : loadError}</div>
      )}
    </div>
  );
}
