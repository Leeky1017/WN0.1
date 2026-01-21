import type {
  WritenowConversationIndexItem,
  WritenowConversationMessage,
  WritenowConversationSummaryQuality,
} from '../../types/ipc';

import { IpcError, judgeOps } from '../ipc';
import { updateConversationAnalysis } from './conversation-update';

export type ConversationSummary = {
  summary: string;
  keyTopics: string[];
  skillsUsed: string[];
  userPreferences: {
    accepted: string[];
    rejected: string[];
  };
  quality: WritenowConversationSummaryQuality;
};

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => coerceString(v)).filter(Boolean);
}

function safeParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseConversationSummaryJson(raw: string): Omit<ConversationSummary, 'quality'> | null {
  const parsed = safeParseJson(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const summary = coerceString(obj.summary);
  if (!summary) return null;

  const keyTopics = coerceStringArray(obj.keyTopics);
  const skillsUsed = coerceStringArray(obj.skillsUsed);

  const prefs = obj.userPreferences;
  const prefsObj = prefs && typeof prefs === 'object' ? (prefs as Record<string, unknown>) : null;
  const accepted = coerceStringArray(prefsObj?.accepted);
  const rejected = coerceStringArray(prefsObj?.rejected);

  return {
    summary,
    keyTopics,
    skillsUsed,
    userPreferences: { accepted, rejected },
  };
}

function clampText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function buildL2Prompt(input: {
  articleId: string;
  skillId: string;
  skillName: string;
  outcome: string;
  messages: WritenowConversationMessage[];
}): string {
  const transcript = input.messages
    .map((m) => {
      const role = m.role.toUpperCase();
      const content = clampText(coerceString(m.content), 2000);
      return `${role}:\n${content}`;
    })
    .join('\n\n---\n\n');

  return [
    'You are a writing assistant that summarizes an AI editing interaction for future context injection.',
    'Return ONLY valid JSON matching this schema:',
    '{',
    '  "summary": string,',
    '  "keyTopics": string[],',
    '  "skillsUsed": string[],',
    '  "userPreferences": { "accepted": string[], "rejected": string[] }',
    '}',
    '',
    'Constraints:',
    '- summary: <= 120 Chinese characters (or <= 240 ASCII characters).',
    '- keyTopics: 0-6 items.',
    '- userPreferences: capture stable preference signals (tone/format/constraints), not one-off content.',
    '',
    `Context: articleId=${input.articleId}, skill=${input.skillName} (${input.skillId}), outcome=${input.outcome}`,
    '',
    'Transcript:',
    transcript,
  ].join('\n');
}

export function buildHeuristicSummary(input: {
  articleId: string;
  skillId: string;
  skillName: string;
  outcome: 'accepted' | 'rejected' | 'canceled' | 'error';
  originalText: string;
  suggestedText: string;
}): ConversationSummary {
  const originalSnippet = clampText(coerceString(input.originalText), 160);
  const suggestedSnippet = clampText(coerceString(input.suggestedText), 160);

  const summary = [
    `文章 ${input.articleId} 使用「${input.skillName}」(${input.skillId}) 的一次交互（${input.outcome}）。`,
    originalSnippet ? `原文要点：${originalSnippet}` : '',
    suggestedSnippet ? `建议要点：${suggestedSnippet}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const preferences =
    input.outcome === 'accepted'
      ? { accepted: [`skill:${input.skillId}`], rejected: [] }
      : input.outcome === 'rejected'
        ? { accepted: [], rejected: [`skill:${input.skillId}`] }
        : { accepted: [], rejected: [] };

  return {
    summary,
    keyTopics: [],
    skillsUsed: [input.skillId],
    userPreferences: preferences,
    quality: 'heuristic',
  };
}

/**
 * Runs L2 summary generation asynchronously and writes results back to `.writenow/conversations/index.json`.
 * Why: summaries are injected instead of full transcripts to keep token usage bounded.
 */
export async function generateAndPersistConversationSummary(input: {
  projectId: string;
  conversationId: string;
  articleId: string;
  skillId: string;
  skillName: string;
  outcome: 'accepted' | 'rejected' | 'canceled' | 'error';
  originalText: string;
  suggestedText: string;
  messages: WritenowConversationMessage[];
}): Promise<WritenowConversationIndexItem> {
  let summary: ConversationSummary | null = null;

  try {
    const prompt = buildL2Prompt({
      articleId: input.articleId,
      skillId: input.skillId,
      skillName: input.skillName,
      outcome: input.outcome,
      messages: input.messages,
    });

    const res = await judgeOps.promptL2({
      prompt,
      timeoutMs: 3000,
      temperature: 0.2,
      maxTokens: 256,
    });

    const parsed = parseConversationSummaryJson(res.output);
    if (parsed) {
      summary = {
        ...parsed,
        quality: 'l2',
      };
    }
  } catch (error) {
    if (!(error instanceof IpcError)) {
      summary = null;
    } else if (error.code === 'MODEL_NOT_READY' || error.code === 'TIMEOUT' || error.code === 'CANCELED') {
      summary = null;
    } else {
      summary = null;
    }
  }

  if (!summary) {
    summary = buildHeuristicSummary({
      articleId: input.articleId,
      skillId: input.skillId,
      skillName: input.skillName,
      outcome: input.outcome,
      originalText: input.originalText,
      suggestedText: input.suggestedText,
    });
  }

  return updateConversationAnalysis({
    projectId: input.projectId,
    conversationId: input.conversationId,
    analysis: {
      summary: summary.summary,
      summaryQuality: summary.quality,
      keyTopics: summary.keyTopics,
      skillsUsed: summary.skillsUsed,
      userPreferences: summary.userPreferences,
    },
  });
}

