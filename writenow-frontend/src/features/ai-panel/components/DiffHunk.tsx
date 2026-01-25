/**
 * DiffHunk
 * Why: Render a single diff hunk with selectable acceptance state.
 */

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DiffHunk as DiffHunkType } from '@/lib/diff/diffUtils';

export interface DiffHunkProps {
  hunk: DiffHunkType;
  accepted: boolean;
  onToggle?: () => void;
}

export function DiffHunk({ hunk, accepted, onToggle }: DiffHunkProps) {
  const isChange = hunk.type !== 'unchanged';
  const prefix = hunk.type === 'add' ? '+' : hunk.type === 'remove' ? '-' : ' ';

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-1.5 text-xs font-mono border-b border-[var(--border-subtle)]',
        hunk.type === 'add' && 'bg-[color:var(--color-success)]/10 text-[var(--color-success)]',
        hunk.type === 'remove' && 'bg-[color:var(--color-error)]/10 text-[var(--color-error)]',
        hunk.type === 'unchanged' && 'text-[var(--text-muted)]',
      )}
    >
      {isChange ? (
        <button
          type="button"
          className={cn(
            'mt-0.5 flex h-4 w-4 items-center justify-center rounded border',
            accepted
              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
              : 'border-[var(--border-default)] text-transparent',
          )}
          aria-pressed={accepted}
          onClick={onToggle}
        >
          <Check className="h-3 w-3" />
        </button>
      ) : (
        <span className="mt-0.5 h-4 w-4" />
      )}
      <span className="text-[var(--text-muted)]">{prefix}</span>
      <pre className="whitespace-pre-wrap break-words flex-1">
        {hunk.content}
      </pre>
    </div>
  );
}

export default DiffHunk;
