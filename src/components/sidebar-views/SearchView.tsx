import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSearch, type SearchMode } from '../../hooks/useSearch';
import { useProjectsStore } from '../../stores/projectsStore';
import { useEditorStore } from '../../stores/editorStore';
import { SearchResults } from '../Search/SearchResults';

type SearchViewProps = {
  selectedFile: string | null;
  onSelectFile: (file: string) => void | Promise<void>;
};

type TextRange = { start: number; end: number };

function buildMatchTokens(query: string) {
  const raw = query.trim();
  if (!raw) return [];
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/^"(.+)"$/, '$1').replace(/[*]/g, '').trim())
    .filter((t) => t.length > 0)
    .filter((t) => !['AND', 'OR', 'NOT', 'NEAR'].includes(t.toUpperCase()));
  return Array.from(new Set(tokens)).slice(0, 8);
}

function findMatches(content: string, tokens: string[], maxMatches = 200): TextRange[] {
  const raw = typeof content === 'string' ? content : '';
  if (!raw) return [];
  if (tokens.length === 0) return [];

  const haystack = raw.toLowerCase();
  const ranges: TextRange[] = [];

  for (const token of tokens) {
    if (ranges.length >= maxMatches) break;
    const needle = token.toLowerCase();
    if (!needle) continue;
    let cursor = 0;
    while (cursor < haystack.length && ranges.length < maxMatches) {
      const idx = haystack.indexOf(needle, cursor);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + needle.length });
      cursor = idx + needle.length;
    }
  }

  ranges.sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end));
  const deduped: TextRange[] = [];
  for (const range of ranges) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.start === range.start && prev.end === range.end) continue;
    deduped.push(range);
  }
  return deduped;
}

export function SearchView({ selectedFile, onSelectFile }: SearchViewProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('fulltext');
  const projectId = useProjectsStore((s) => s.currentProjectId);
  const requestJumpToRange = useEditorStore((s) => s.requestJumpToRange);

  const { items, page, isLoading, error, loadMore } = useSearch({
    query: searchQuery,
    mode,
    projectId,
    limit: 20,
    debounceMs: 200,
    cacheTtlMs: 30_000,
  });

  const matchTokens = useMemo(() => buildMatchTokens(searchQuery), [searchQuery]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [matches, setMatches] = useState<TextRange[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  const jumpToMatch = (nextIndex: number) => {
    if (matches.length === 0) return;
    const safeIndex = ((nextIndex % matches.length) + matches.length) % matches.length;
    const range = matches[safeIndex];
    if (!range) return;
    requestJumpToRange(range);
    setMatchIndex(safeIndex);
  };

  const selectResult = async (id: string) => {
    setActiveDocId(id);
    setMatches([]);
    setMatchIndex(0);

    await onSelectFile(id);

    const content = useEditorStore.getState().tabStateById[id]?.content ?? '';
    const ranges = findMatches(content, matchTokens);
    setMatches(ranges);
    setMatchIndex(0);
    if (ranges.length > 0) {
      requestJumpToRange(ranges[0]);
    }
  };

  const navEnabled = Boolean(activeDocId && selectedFile && selectedFile === activeDocId && matches.length > 0);

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('search.title')}</span>
        {navEnabled && (
          <div className="flex items-center gap-1">
            <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums px-1">
              {matchIndex + 1}/{matches.length}
            </div>
            <button
              type="button"
              onClick={() => jumpToMatch(matchIndex - 1)}
              data-testid="search-prev-match"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
              title={t('search.prevMatch')}
            >
              <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>
            <button
              type="button"
              onClick={() => jumpToMatch(matchIndex + 1)}
              data-testid="search-next-match"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
              title={t('search.nextMatch')}
            >
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveDocId(null);
              setMatches([]);
              setMatchIndex(0);
            }}
            data-testid="search-input"
            className="w-full h-7 pl-8 pr-7 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-tertiary)] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveDocId(null);
                setMatches([]);
                setMatchIndex(0);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded-md transition-colors"
            >
              <X className="w-3 h-3 text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('fulltext');
              setActiveDocId(null);
              setMatches([]);
              setMatchIndex(0);
            }}
            data-testid="search-mode-fulltext"
            className={`h-7 px-2 rounded-md text-[12px] transition-colors ${
              mode === 'fulltext'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            }`}
          >
            {t('search.mode.fulltext')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('semantic');
              setActiveDocId(null);
              setMatches([]);
              setMatchIndex(0);
            }}
            data-testid="search-mode-semantic"
            className={`h-7 px-2 rounded-md text-[12px] transition-colors ${
              mode === 'semantic'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            }`}
          >
            {t('search.mode.semantic')}
          </button>
        </div>

        <div className="mt-3">
          {error && (
            <div className="text-[12px] text-red-400 leading-relaxed">
              {t('search.failed', { error })}
            </div>
          )}

          {!error && isLoading && items.length === 0 && (
            <div className="text-[12px] text-[var(--text-tertiary)] py-8 text-center">{t('search.loading')}</div>
          )}

          {!error && !isLoading && searchQuery.trim() !== '' && items.length === 0 && (
            <div className="text-[12px] text-[var(--text-tertiary)] py-8 text-center">{t('search.empty')}</div>
          )}

          {items.length > 0 && (
            <>
              <SearchResults query={searchQuery} items={items} selectedId={selectedFile} onSelect={selectResult} />
              {page?.nextCursor && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => loadMore().catch(() => undefined)}
                    data-testid="search-load-more"
                    className="w-full h-8 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
                    disabled={isLoading}
                  >
                    {t('search.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
