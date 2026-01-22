import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ArticleSnapshot } from '../../types/models';

export type VersionListItem = Omit<ArticleSnapshot, 'content'>;

type VersionHistoryProps = {
  items: VersionListItem[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRefresh: () => void;
  onPreview: (snapshotId: string) => void;
};

function formatTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function VersionHistory({ items, isLoading, errorMessage, onRefresh, onPreview }: VersionHistoryProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  return (
    <div className="wn-elevated rounded-md border border-[var(--border-subtle)] overflow-hidden">
      <div className="h-10 px-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="text-[12px] text-[var(--text-secondary)] font-medium">{t('ai.history.title')}</div>
        <button
          type="button"
          onClick={onRefresh}
          className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
          disabled={isLoading}
        >
          {t('common.refresh')}
        </button>
      </div>

      {errorMessage && <div className="px-3 py-2 text-[12px] text-red-300 border-b border-[var(--border-subtle)]">{errorMessage}</div>}

      <div className="max-h-[240px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-[var(--text-tertiary)]">{t('ai.history.empty')}</div>
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
                    {item.name || item.reason || t('ai.history.untitledVersion')}
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">{formatTime(item.createdAt, locale)}</div>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {t(`ai.history.actor.${item.actor}`)}
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
