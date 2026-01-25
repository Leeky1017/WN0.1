/**
 * VersionDiff
 * Why: Render unified diff output from backend `version:diff`.
 */

import { FileDiff } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface VersionDiffProps {
  diff: string;
}

export function VersionDiff({ diff }: VersionDiffProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
        <FileDiff className="w-4 h-4 text-[var(--text-muted)]" />
        版本 Diff
      </div>
      <pre
        className={cn(
          'max-h-72 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap break-words',
          'text-[var(--text-primary)]',
        )}
      >
        {diff}
      </pre>
    </div>
  );
}

export default VersionDiff;

