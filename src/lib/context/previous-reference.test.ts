import { describe, expect, test } from 'vitest';

import { buildPreviousReferenceFragment, hasPreviousReferenceIntent, pickPreviousReference } from './previous-reference';

describe('previous-reference', () => {
  test('hasPreviousReferenceIntent detects Chinese phrases', () => {
    expect(hasPreviousReferenceIntent('像上次那样继续写')).toBe(true);
    expect(hasPreviousReferenceIntent('和上次一样')).toBe(true);
    expect(hasPreviousReferenceIntent('请润色一下')).toBe(false);
  });

  test('pickPreviousReference prefers entries with summary', () => {
    const picked = pickPreviousReference([
      {
        id: 'c1',
        articleId: 'a1',
        createdAt: 't1',
        updatedAt: 't1',
        messageCount: 1,
        summary: '',
        summaryQuality: 'placeholder',
        keyTopics: [],
        skillsUsed: [],
        userPreferences: { accepted: [], rejected: [] },
        fullPath: 'conversations/c1.json',
      },
      {
        id: 'c2',
        articleId: 'a1',
        createdAt: 't2',
        updatedAt: 't2',
        messageCount: 1,
        summary: 'ok',
        summaryQuality: 'l2',
        keyTopics: [],
        skillsUsed: [],
        userPreferences: { accepted: [], rejected: [] },
        fullPath: 'conversations/c2.json',
      },
    ]);
    expect(picked?.id).toBe('c2');
  });

  test('buildPreviousReferenceFragment is traceable and bounded', () => {
    const frag = buildPreviousReferenceFragment({
      id: 'c1',
      articleId: 'a1',
      createdAt: 't1',
      updatedAt: 't1',
      messageCount: 3,
      summary: 'summary',
      summaryQuality: 'heuristic',
      keyTopics: [],
      skillsUsed: [],
      userPreferences: { accepted: ['p1'], rejected: [] },
      fullPath: 'conversations/c1.json',
    });
    expect(frag.layer).toBe('retrieved');
    expect(frag.source.kind).toBe('conversation');
    expect(frag.content).toContain('conversationId: c1');
    expect(frag.priority).toBeGreaterThan(0);
  });
});

