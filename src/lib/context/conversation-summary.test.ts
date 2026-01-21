import { describe, expect, test } from 'vitest';

import { buildHeuristicSummary, parseConversationSummaryJson } from './conversation-summary';

describe('conversation-summary', () => {
  test('parseConversationSummaryJson returns null for invalid json', () => {
    expect(parseConversationSummaryJson('not-json')).toBeNull();
    expect(parseConversationSummaryJson('{}')).toBeNull();
  });

  test('parseConversationSummaryJson parses structured json', () => {
    const parsed = parseConversationSummaryJson(
      JSON.stringify({
        summary: '一次润色交互',
        keyTopics: ['润色', '语气'],
        skillsUsed: ['builtin:polish'],
        userPreferences: { accepted: ['偏好简洁'], rejected: [] },
      }),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.summary).toBe('一次润色交互');
    expect(parsed?.keyTopics).toContain('润色');
    expect(parsed?.skillsUsed).toContain('builtin:polish');
    expect(parsed?.userPreferences.accepted).toContain('偏好简洁');
  });

  test('buildHeuristicSummary produces non-empty summary and quality', () => {
    const result = buildHeuristicSummary({
      articleId: 'a1',
      skillId: 'builtin:polish',
      skillName: 'Polish',
      outcome: 'accepted',
      originalText: '原文'.repeat(50),
      suggestedText: '建议'.repeat(50),
    });

    expect(result.quality).toBe('heuristic');
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.skillsUsed).toContain('builtin:polish');
  });
});

