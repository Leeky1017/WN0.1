import { describe, expect, test } from 'vitest';

import type { ConstraintRule } from '../types';

import { checkForbiddenWords } from './forbidden-words';
import { checkFormat } from './format';
import { checkTerminology } from './terminology';
import { checkWordCount } from './word-count';

function rule(overrides: Partial<ConstraintRule> & Pick<ConstraintRule, 'id' | 'type'>): ConstraintRule {
  return {
    id: overrides.id,
    type: overrides.type,
    enabled: overrides.enabled ?? true,
    config: overrides.config ?? {},
    level: overrides.level ?? 'warning',
    scope: overrides.scope ?? 'global',
    projectId: overrides.projectId,
  };
}

describe('L1 rules', () => {
  test('forbidden words: overlapping matches are reported', () => {
    const r = rule({ id: 'global:forbidden_words', type: 'forbidden_words', level: 'error', config: { words: ['aa'] } });
    const violations = checkForbiddenWords('aaa', r);
    expect(violations).toHaveLength(2);
    expect(violations[0].position).toEqual({ start: 0, end: 2 });
    expect(violations[1].position).toEqual({ start: 1, end: 3 });
  });

  test('word count: max triggers violation', () => {
    const r = rule({ id: 'global:word_count', type: 'word_count', config: { max: 2 }, level: 'error' });
    const violations = checkWordCount('abc', r);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('字数超标');
  });

  test('format: list_only marks first non-list line', () => {
    const r = rule({ id: 'global:format', type: 'format', config: { mode: 'list_only' }, level: 'warning' });
    const violations = checkFormat('段落\n- 列表项\n', r);
    expect(violations).toHaveLength(1);
    expect(violations[0].position).toEqual({ start: 0, end: 2 });
  });

  test('terminology: alias suggests canonical', () => {
    const r = rule({
      id: 'global:terminology',
      type: 'terminology',
      config: { terms: [{ canonical: 'WriteNow', aliases: ['WN'] }] },
      level: 'warning',
    });
    const violations = checkTerminology('WN 是一个应用', r);
    expect(violations).toHaveLength(1);
    expect(violations[0].suggestion).toContain('WriteNow');
  });
});
