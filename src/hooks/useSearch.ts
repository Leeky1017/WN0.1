import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PageInfo, SearchHit, SearchSemanticHit } from '../types/ipc';
import { IpcError, searchOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

export type SearchMode = 'fulltext' | 'semantic';

export type SidebarSearchItem = {
  id: string;
  title: string;
  snippet: string;
  score?: number;
};

type SearchCacheEntry = {
  items: SidebarSearchItem[];
  page: PageInfo;
  savedAtMs: number;
};

type UseSearchArgs = {
  query: string;
  mode: SearchMode;
  projectId: string | null;
  limit?: number;
  debounceMs?: number;
  cacheTtlMs?: number;
};

type UseSearchResult = {
  query: string;
  mode: SearchMode;
  items: SidebarSearchItem[];
  page: PageInfo | null;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function normalizeHit(hit: SearchHit | SearchSemanticHit): SidebarSearchItem | null {
  const id = typeof hit?.id === 'string' ? hit.id : '';
  const title = typeof hit?.title === 'string' ? hit.title : '';
  const snippet = typeof hit?.snippet === 'string' ? hit.snippet : '';
  if (!id || !title) return null;

  const scoreRaw = (hit as SearchSemanticHit).score;
  const score = typeof scoreRaw === 'number' && Number.isFinite(scoreRaw) ? scoreRaw : undefined;
  return { id, title, snippet, score };
}

function makeCacheKey(mode: SearchMode, projectId: string | null, query: string) {
  const pid = projectId ? projectId.trim() : '';
  return `${mode}::${pid || '∅'}::${query}`;
}

/**
 * Why: search IPC is async and potentially slow; the hook provides debouncing, pagination, and an explicit cache so UI
 * can stay responsive on large projects without introducing hidden global state.
 */
export function useSearch(args: UseSearchArgs): UseSearchResult {
  const normalizedQuery = useMemo(() => args.query.trim(), [args.query]);
  const limit = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.max(1, Math.min(50, Math.floor(args.limit))) : 20;
  const debounceMs =
    typeof args.debounceMs === 'number' && Number.isFinite(args.debounceMs) ? Math.max(0, Math.floor(args.debounceMs)) : 200;
  const cacheTtlMs =
    typeof args.cacheTtlMs === 'number' && Number.isFinite(args.cacheTtlMs) ? Math.max(0, Math.floor(args.cacheTtlMs)) : 30_000;

  const [cache, setCache] = useState(() => new Map<string, SearchCacheEntry>());
  const requestSeqRef = useRef(0);

  const cacheKey = useMemo(() => {
    if (!normalizedQuery) return null;
    return makeCacheKey(args.mode, args.projectId, normalizedQuery);
  }, [args.mode, args.projectId, normalizedQuery]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [items, setItems] = useState<SidebarSearchItem[]>([]);
  const [page, setPage] = useState<PageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readCache = useCallback(
    (key: string) => {
      const entry = cache.get(key);
      if (!entry) return null;
      if (cacheTtlMs <= 0) return null;
      if (Date.now() - entry.savedAtMs > cacheTtlMs) return null;
      return entry;
    },
    [cache, cacheTtlMs],
  );

  const writeCache = useCallback((key: string, entry: SearchCacheEntry) => {
    setCache((prev) => {
      const next = new Map(prev);
      next.set(key, entry);
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (options: { cursor?: string; append?: boolean; force?: boolean }) => {
      if (!normalizedQuery) return;
      const cacheKey = makeCacheKey(args.mode, args.projectId, normalizedQuery);
      setActiveKey(cacheKey);
      if (!options.force && !options.append) {
        const cached = readCache(cacheKey);
        if (cached) {
          setItems(cached.items);
          setPage(cached.page);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      const requestId = (requestSeqRef.current += 1);
      setIsLoading(true);
      setError(null);

      try {
        const payloadBase = {
          query: normalizedQuery,
          projectId: args.projectId ?? undefined,
          limit,
          cursor: options.cursor,
        } as const;

        const response = args.mode === 'fulltext' ? await searchOps.fulltext(payloadBase) : await searchOps.semantic(payloadBase);
        if (requestId !== requestSeqRef.current) return;

        const nextItems = response.items.map(normalizeHit).filter((v): v is SidebarSearchItem => v !== null);
        const scoreOf = (item: SidebarSearchItem) => (typeof item.score === 'number' ? item.score : Number.NEGATIVE_INFINITY);
        nextItems.sort((a, b) => scoreOf(b) - scoreOf(a));

        const base = options.append ? readCache(cacheKey)?.items ?? [] : [];
        const merged = options.append ? [...base, ...nextItems] : nextItems;
        setItems(merged);
        setPage(response.page);
        setIsLoading(false);
        setError(null);

        writeCache(cacheKey, { items: merged, page: response.page, savedAtMs: Date.now() });
      } catch (e) {
        if (requestId !== requestSeqRef.current) return;
        setIsLoading(false);
        setError(toErrorMessage(e));
      }
    },
    [args.mode, args.projectId, limit, normalizedQuery, readCache, writeCache],
  );

  useEffect(() => {
    requestSeqRef.current += 1;

    if (!cacheKey) return;
    if (readCache(cacheKey)) return;
    const timer = window.setTimeout(() => {
      runSearch({ force: true }).catch(() => undefined);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [cacheKey, debounceMs, readCache, runSearch]);

  const loadMore = useCallback(async () => {
    if (!cacheKey) return;
    const nextCursor = readCache(cacheKey)?.page.nextCursor ?? (activeKey === cacheKey ? page?.nextCursor : null);
    if (!nextCursor) return;
    if (activeKey === cacheKey && isLoading) return;
    await runSearch({ cursor: nextCursor, append: true, force: true });
  }, [activeKey, cacheKey, isLoading, page?.nextCursor, readCache, runSearch]);

  const refresh = useCallback(async () => {
    if (!normalizedQuery) return;
    await runSearch({ force: true });
  }, [normalizedQuery, runSearch]);

  const cached = cacheKey ? readCache(cacheKey) : null;
  const isCurrent = Boolean(cacheKey && activeKey === cacheKey);

  const resolvedItems = !normalizedQuery ? [] : cached?.items ?? (isCurrent ? items : []);
  const resolvedPage = !normalizedQuery ? null : cached?.page ?? (isCurrent ? page : null);
  const resolvedError = !normalizedQuery ? null : isCurrent ? error : null;
  const resolvedLoading = !normalizedQuery ? false : isCurrent ? isLoading : false;

  return {
    query: normalizedQuery,
    mode: args.mode,
    items: resolvedItems,
    page: resolvedPage,
    isLoading: resolvedLoading,
    error: resolvedError,
    loadMore,
    refresh,
  };
}
