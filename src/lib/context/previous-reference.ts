import type { ContextFragmentInput } from '../../types/context';
import type { WritenowConversationIndexItem } from '../../types/ipc';

import { listConversations } from './conversation';
import { joinWritenowPath } from './writenow-paths';

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Detects “like last time” intent.
 * Why: avoid any I/O when the user is not asking for historical recall.
 */
export function hasPreviousReferenceIntent(userInstruction: string): boolean {
  const raw = coerceString(userInstruction);
  if (!raw) return false;

  const lower = raw.toLowerCase();
  if (lower.includes('like last time') || lower.includes('same as last time')) return true;

  return (
    raw.includes('像上次那样') ||
    raw.includes('跟上次一样') ||
    raw.includes('和上次一样') ||
    raw.includes('像之前那样') ||
    raw.includes('跟之前一样') ||
    raw.includes('和之前一样')
  );
}

export function pickPreviousReference(items: WritenowConversationIndexItem[]): WritenowConversationIndexItem | null {
  const list = Array.isArray(items) ? items : [];
  const withSummary = list.find((i) => coerceString(i.summary));
  return withSummary ?? list[0] ?? null;
}

export function buildPreviousReferenceFragment(item: WritenowConversationIndexItem): ContextFragmentInput {
  const summary = coerceString(item.summary) || '(summary pending)';
  const accepted = item.userPreferences?.accepted ?? [];
  const rejected = item.userPreferences?.rejected ?? [];

  const lines: string[] = [];
  lines.push('Previous conversation reference (for “像上次那样”):');
  lines.push(`- conversationId: ${item.id}`);
  lines.push(`- summaryQuality: ${item.summaryQuality}`);
  lines.push('');
  lines.push('Summary:');
  lines.push(summary);

  if (accepted.length > 0) {
    lines.push('');
    lines.push('Accepted preference signals:');
    for (const p of accepted) lines.push(`- ${p}`);
  }

  if (rejected.length > 0) {
    lines.push('');
    lines.push('Rejected preference signals:');
    for (const p of rejected) lines.push(`- ${p}`);
  }

  return {
    id: `retrieved:previous-reference:${item.id}`,
    layer: 'retrieved',
    source: { kind: 'conversation', id: item.id, path: joinWritenowPath(item.fullPath) },
    content: lines.join('\n'),
    priority: 20,
    meta: {
      conversationId: item.id,
      summaryQuality: item.summaryQuality,
      articleId: item.articleId,
      fullPath: item.fullPath,
    },
  };
}

/**
 * Loads previous-reference chunks from persisted conversation history.
 * Why: resolve “像上次那样” by injecting bounded, traceable summaries into Retrieved.
 */
export async function loadPreviousReferenceFragments(input: {
  projectId: string;
  articleId?: string;
  userInstruction: string;
}): Promise<ContextFragmentInput[]> {
  if (!hasPreviousReferenceIntent(input.userInstruction)) return [];

  const res = await listConversations({
    projectId: input.projectId,
    ...(coerceString(input.articleId) ? { articleId: coerceString(input.articleId) } : {}),
    limit: 20,
  });

  const picked = pickPreviousReference(res.items);
  if (!picked) return [];

  return [buildPreviousReferenceFragment(picked)];
}

