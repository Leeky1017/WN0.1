import React, { useMemo } from 'react';

import type { ArticleSnapshot } from '../../types/models';

export type VersionListItem = Omit<ArticleSnapshot, 'content'>;

type VersionHistoryProps = {
  items: VersionListItem[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRefresh: () => void;
  onPreview: (snapshotId: string) => void;
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function actorLabel(actor: VersionListItem['actor']): string {
  if (actor === 'ai') return 'AI';
  if (actor === 'auto') return 'Auto';
  return 'User';
}

export function VersionHistory({ items, isLoading, errorMessage, onRefresh, onPreview }: VersionHistoryProps) {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  return (
    <div className="wn-elevated rounded-md border border-[var(--border-subtle)] overflow-hidden">
      <div className="h-10 px-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="text-[12px] text-[var(--text-secondary)] font-medium">版本历史</div>
        <button
          type="button"
          onClick={onRefresh}
          className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
          disabled={isLoading}
        >
          刷新
        </button>
      </div>

      {errorMessage && <div className="px-3 py-2 text-[12px] text-red-300 border-b border-[var(--border-subtle)]">{errorMessage}</div>}

      <div className="max-h-[240px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-[var(--text-tertiary)]">暂无版本</div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {sorted.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onPreview(item.id)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors"
                title={item.reason || ''}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[var(--text-secondary)] truncate">
                    {item.name || item.reason || '未命名版本'}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">{formatTime(item.createdAt)}</div>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {actorLabel(item.actor)}
                  {item.reason ? ` · ${item.reason}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

