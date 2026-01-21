import { describe, expect, test } from 'vitest';

import { buildAiConversationMessages } from './conversation';

describe('conversation', () => {
  test('buildAiConversationMessages emits stable 3-message transcript', () => {
    const messages = buildAiConversationMessages({
      projectId: 'p1',
      articleId: 'a1',
      skillId: 'builtin:polish',
      skillName: 'Polish',
      outcome: 'accepted',
      originalText: '原文',
      suggestedText: '建议稿',
    });

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[2].role).toBe('assistant');
    expect(messages[0].content).toContain('WriteNow Conversation');
    expect(messages[0].content).toContain('Article: a1');
    expect(messages[0].content).toContain('Skill: Polish (builtin:polish)');
    expect(messages[0].content).toContain('Outcome: accepted');
  });
});

