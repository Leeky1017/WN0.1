/**
 * Version history feature barrel export
 * Note: Full VersionHistoryPanel component requires additional UI components.
 * For now, we export the hook and types.
 */

import { useCallback, useState } from 'react';
import { invoke } from '@/lib/rpc';
import type { VersionListItem } from '@/types/ipc-generated';

export interface UseVersionHistoryResult {
  versions: VersionListItem[];
  loading: boolean;
  error: string | null;
  loadVersions: (articleId: string) => Promise<void>;
  createVersion: (articleId: string, content: string, name?: string) => Promise<string>;
  restoreVersion: (snapshotId: string) => Promise<{ content: string; articleId: string }>;
}

export function useVersionHistory(): UseVersionHistoryResult {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async (articleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoke('version:list', { articleId, limit: 50 });
      setVersions(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, []);

  const createVersion = useCallback(async (articleId: string, content: string, name?: string) => {
    const response = await invoke('version:create', { articleId, content, name, actor: 'user' });
    return response.snapshotId;
  }, []);

  const restoreVersion = useCallback(async (snapshotId: string) => {
    const response = await invoke('version:restore', { snapshotId });
    return { content: response.content, articleId: response.articleId };
  }, []);

  return {
    versions,
    loading,
    error,
    loadVersions,
    createVersion,
    restoreVersion,
  };
}
