/**
 * DiffView
 * Why: Provide an interactive diff viewer with accept/reject controls for AI edits.
 */

import { useMemo } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { computeDiff } from '@/lib/diff/diffUtils';
import type { AiDiffState } from '@/stores';
import { cn } from '@/lib/utils';
import { DiffHunk } from './DiffHunk';

export interface DiffViewProps {
  diff: AiDiffState;
  onToggleHunk: (index: number) => void;
  onAccept: () => void;
  onReject: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function DiffView({ diff, onToggleHunk, onAccept, onReject, onAcceptAll, onRejectAll }: DiffViewProps) {
  const hunks = useMemo(() => computeDiff(diff.originalText, diff.suggestedText), [diff.originalText, diff.suggestedText]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="text-xs text-[var(--text-secondary)]">AI 修改预览</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn('text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
            onClick={onAcceptAll}
          >
            全选
          </button>
          <button
            type="button"
            className={cn('text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
            onClick={onRejectAll}
          >
            全不选
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-auto">
        {hunks.map((hunk, index) => (
          <DiffHunk
            key={`${hunk.type}-${index}`}
            hunk={hunk}
            accepted={diff.accepted[index] ?? true}
            onToggle={hunk.type === 'unchanged' ? undefined : () => onToggleHunk(index)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-input)]">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
          <RefreshCw className="h-3 w-3" />
          <span>Cmd/Ctrl+Enter 接受，Cmd/Ctrl+Backspace 拒绝</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onAccept}>
            <Check className="h-3.5 w-3.5" />
            接受
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-3.5 w-3.5" />
            拒绝
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DiffView;
