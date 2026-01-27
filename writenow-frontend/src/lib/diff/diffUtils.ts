/**
 * Diff utilities
 * Why: AI rewrite workflows require a readable diff view and the ability to accept/reject changes deterministically.
 */

import { diffLines } from 'diff';

export type DiffHunkType = 'add' | 'remove' | 'unchanged';

export interface DiffHunk {
  type: DiffHunkType;
  content: string;
}

export function computeDiff(original: string, modified: string): DiffHunk[] {
  const changes = diffLines(original, modified);
  return changes.map((change) => ({
    type: change.added ? 'add' : change.removed ? 'remove' : 'unchanged',
    content: change.value,
  }));
}

export function mergeDiff(original: string, modified: string, accepted: boolean[]): string {
  const hunks = computeDiff(original, modified);
  if (accepted.length !== hunks.length) {
    throw new Error('accepted mask length mismatch');
  }

  let out = '';
  for (let i = 0; i < hunks.length; i += 1) {
    const hunk = hunks[i];
    const take = accepted[i];
    if (hunk.type === 'unchanged') {
      out += hunk.content;
      continue;
    }
    if (hunk.type === 'add') {
      if (take) out += hunk.content;
      continue;
    }
    // removed: accepting means dropping it; rejecting means keeping original lines.
    if (!take) out += hunk.content;
  }
  return out;
}
