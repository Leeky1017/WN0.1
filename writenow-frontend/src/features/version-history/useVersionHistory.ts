/**
 * useVersionHistory hook
 * Why: Encapsulate version history operations (list, diff, restore, create).
 */

import { useCallback, useState } from 'react';
import { invoke } from '@/lib/rpc';
import type { VersionListItem } from '@/types/ipc-generated';

export interface UseVersionHistoryResult {
  /** List of versions */
  versions: VersionListItem[];
  /** Loading state */
  loading: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Current diff result (unified format) */
  diffResult: string | null;
  /** IDs of versions being compared */
  diffVersions: { from: string; to: string } | null;
  /** Load versions for an article */
  loadVersions: (articleId: string) => Promise<void>;
  /** Create a new version */
  createVersion: (articleId: string, content: string, name?: string) => Promise<string>;
  /** Restore a version */
  restoreVersion: (snapshotId: string) => Promise<{ content: string; articleId: string }>;
  /** Get diff between two versions */
  getDiff: (fromSnapshotId: string, toSnapshotId: string) => Promise<void>;
  /** Clear diff result */
  clearDiff: () => void;
}

/**
 * Hook for managing version history state and operations.
 */
export function useVersionHistory(): UseVersionHistoryResult {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<string | null>(null);
  const [diffVersions, setDiffVersions] = useState<{ from: string; to: string } | null>(null);

  const loadVersions = useCallback(async (articleId: string) => {
    if (!articleId) {
      setVersions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await invoke('version:list', { articleId, limit: 50 });
      setVersions(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载版本历史失败');
      setVersions([]);
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

  const getDiff = useCallback(async (fromSnapshotId: string, toSnapshotId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoke('version:diff', { fromSnapshotId, toSnapshotId });
      setDiffResult(response.diff);
      setDiffVersions({ from: fromSnapshotId, to: toSnapshotId });
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取版本差异失败');
      setDiffResult(null);
      setDiffVersions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDiff = useCallback(() => {
    setDiffResult(null);
    setDiffVersions(null);
  }, []);

  return {
    versions,
    loading,
    error,
    diffResult,
    diffVersions,
    loadVersions,
    createVersion,
    restoreVersion,
    getDiff,
    clearDiff,
  };
}
