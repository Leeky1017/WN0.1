import type { ConstraintRule, IJudge, JudgeResult } from './types';

import { checkForbiddenWords } from './rules/forbidden-words';
import { checkFormat } from './rules/format';
import { checkTerminology } from './rules/terminology';
import { checkWordCount } from './rules/word-count';

function nowIso() {
  return new Date().toISOString();
}

export class CodeJudge implements IJudge {
  async check(text: string, rules: ConstraintRule[]): Promise<JudgeResult> {
    const startedAt = Date.now();
    const enabledRules = rules.filter((rule) => rule.enabled);

    const violations = enabledRules.flatMap((rule) => {
      if (rule.type === 'forbidden_words') return checkForbiddenWords(text, rule);
      if (rule.type === 'word_count') return checkWordCount(text, rule);
      if (rule.type === 'format') return checkFormat(text, rule);
      if (rule.type === 'terminology') return checkTerminology(text, rule);
      return [];
    });

    const l1Passed = violations.every((violation) => violation.level !== 'error');

    return {
      passed: l1Passed,
      violations,
      l1Passed,
      l2Passed: true,
      checkedAt: nowIso(),
      durationMs: Date.now() - startedAt,
    };
  }
}
