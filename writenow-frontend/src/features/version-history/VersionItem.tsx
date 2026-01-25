/**
 * VersionItem
 * Why: Render a snapshot row with restore/select actions.
 */

import { History, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { VersionListItem } from '@/types/ipc-generated';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatActor(actor: VersionListItem['actor']): string {
  if (actor === 'ai') return 'AI';
  if (actor === 'auto') return 'Auto';
  return 'User';
}

export interface VersionItemProps {
  item: VersionListItem;
  selected: boolean;
  onSelect: () => void;
  onRestore: () => void;
}

export function VersionItem({ item, selected, onSelect, onRestore }: VersionItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-[var(--radius-sm)] border',
        selected
          ? 'bg-[var(--bg-active)] border-[var(--border-default)]'
          : 'bg-transparent border-transparent hover:bg-[var(--bg-hover)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {item.name || formatTime(item.createdAt)}
          </div>
          <div className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{item.reason || item.id}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <History className="w-3.5 h-3.5" />
          <span>{formatActor(item.actor)}</span>
        </div>
      </div>

      {selected && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRestore();
            }}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            恢复
          </Button>
        </div>
      )}
    </button>
  );
}

export default VersionItem;

