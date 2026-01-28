/**
 * useSearch hook
 * Why: Encapsulate search logic (fulltext/semantic) and state management for the SearchPanel.
 */

import { useCallback, useState } from 'react';
import { invoke } from '@/lib/rpc';
import type { SearchHit, SearchSemanticHit } from '@/types/ipc-generated';

export type SearchMode = 'fulltext' | 'semantic';

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score?: number;
}

export interface UseSearchResult {
  /** Current search mode */
  mode: SearchMode;
  /** Set search mode */
  setMode: (mode: SearchMode) => void;
  /** Search results */
  results: SearchResult[];
  /** Loading state */
  loading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Execute search with current mode */
  search: (query: string) => Promise<void>;
  /** Clear search results */
  clear: () => void;
}

/**
 * Hook for managing search state and executing searches.
 * Supports both full-text and semantic search modes.
 */
export function useSearch(): UseSearchResult {
  const [mode, setMode] = useState<SearchMode>('fulltext');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'fulltext') {
        const response = await invoke('search:fulltext', { query: trimmed, limit: 50 });
        setResults(response.items.map((item: SearchHit) => ({
          id: item.id,
          title: item.title,
          snippet: item.snippet,
          score: item.score,
        })));
      } else {
        const response = await invoke('search:semantic', { query: trimmed, limit: 50 });
        setResults(response.items.map((item: SearchSemanticHit) => ({
          id: item.id,
          title: item.title,
          snippet: item.snippet,
          score: item.score,
        })));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '搜索失败';
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    mode,
    setMode,
    results,
    loading,
    error,
    search,
    clear,
  };
}
