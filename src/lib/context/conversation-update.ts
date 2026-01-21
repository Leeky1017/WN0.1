import type { ContextWritenowConversationsAnalysisUpdateResponse, WritenowConversationIndexItem } from '../../types/ipc';

import { invoke } from '../ipc';

export type ConversationAnalysisUpdate = {
  summary: string;
  summaryQuality: 'placeholder' | 'l2' | 'heuristic';
  keyTopics: string[];
  skillsUsed: string[];
  userPreferences: {
    accepted: string[];
    rejected: string[];
  };
};

/**
 * Updates the persisted conversation analysis and keeps `index.json` in sync.
 * Why: summary generation happens asynchronously and must be recoverable across restarts.
 */
export async function updateConversationAnalysis(input: {
  projectId: string;
  conversationId: string;
  analysis: ConversationAnalysisUpdate;
}): Promise<WritenowConversationIndexItem> {
  const res: ContextWritenowConversationsAnalysisUpdateResponse = await invoke('context:writenow:conversations:analysis:update', input);
  return res.index;
}

