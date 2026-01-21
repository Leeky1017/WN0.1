import type {
  ContextWritenowConversationsListResponse,
  ContextWritenowConversationsReadResponse,
  ContextWritenowConversationsSaveResponse,
  WritenowConversationIndexItem,
  WritenowConversationMessage,
} from '../../types/ipc';

import { invoke } from '../ipc';

export type ConversationOutcome = 'accepted' | 'rejected' | 'canceled' | 'error';

export type ConversationSaveInput = {
  projectId: string;
  articleId: string;
  skillId: string;
  skillName: string;
  outcome: ConversationOutcome;
  originalText: string;
  suggestedText: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Builds a stable, self-contained transcript for long-term memory.
 * Why: the persisted record must remain understandable even if UI schema changes.
 */
export function buildAiConversationMessages(input: ConversationSaveInput): WritenowConversationMessage[] {
  const createdAt = nowIso();
  const header = [
    'WriteNow Conversation',
    `Article: ${input.articleId}`,
    `Skill: ${input.skillName} (${input.skillId})`,
    `Outcome: ${input.outcome}`,
  ].join('\n');

  const userContent = input.originalText;
  const assistantContent = input.suggestedText;

  return [
    { role: 'system', content: header, createdAt },
    { role: 'user', content: userContent, createdAt },
    { role: 'assistant', content: assistantContent, createdAt },
  ];
}

/**
 * Persists a finished AI interaction to `.writenow/conversations/` and updates `index.json`.
 * Why: enables cross-session recall (“像上次那样”) and later preference summarization.
 */
export async function saveAiConversation(input: ConversationSaveInput): Promise<WritenowConversationIndexItem> {
  const messages = buildAiConversationMessages(input);
  const result: ContextWritenowConversationsSaveResponse = await invoke('context:writenow:conversations:save', {
    projectId: input.projectId,
    conversation: {
      articleId: input.articleId,
      messages,
      skillsUsed: [input.skillId],
    },
  });
  return result.index;
}

export async function listConversations(input: {
  projectId: string;
  articleId?: string;
  limit?: number;
}): Promise<ContextWritenowConversationsListResponse> {
  return invoke('context:writenow:conversations:list', input);
}

export async function readConversation(input: {
  projectId: string;
  conversationId: string;
}): Promise<ContextWritenowConversationsReadResponse> {
  return invoke('context:writenow:conversations:read', input);
}

