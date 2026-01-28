/**
 * useOutline hook
 * Why: Encapsulate outline loading/saving and state management.
 */

import { useCallback, useState } from 'react';
import { invoke } from '@/lib/rpc';
import type { OutlineNode } from '@/types/ipc-generated';

export interface UseOutlineResult {
  /** Current outline nodes */
  outline: OutlineNode[];
  /** Loading state */
  loading: boolean;
  /** Error message if operation failed */
  error: string | null;
  /** Last updated timestamp */
  updatedAt: string | null;
  /** Load outline for a document */
  loadOutline: (projectId: string, articleId: string) => Promise<void>;
  /** Save outline for a document */
  saveOutline: (projectId: string, articleId: string, outline: OutlineNode[]) => Promise<void>;
  /** Clear outline state */
  clear: () => void;
}

/**
 * Hook for managing document outline state.
 * Provides load/save operations for outline:get and outline:save IPC channels.
 */
export function useOutline(): UseOutlineResult {
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadOutline = useCallback(async (projectId: string, articleId: string) => {
    if (!projectId || !articleId) {
      setOutline([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await invoke('outline:get', { projectId, articleId });
      setOutline(response.outline ?? []);
      setUpdatedAt(response.updatedAt ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载大纲失败';
      setError(message);
      setOutline([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOutline = useCallback(async (projectId: string, articleId: string, nodes: OutlineNode[]) => {
    if (!projectId || !articleId) {
      setError('缺少项目或文档 ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await invoke('outline:save', { projectId, articleId, outline: nodes });
      setOutline(nodes);
      setUpdatedAt(response.updatedAt);
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存大纲失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setOutline([]);
    setError(null);
    setUpdatedAt(null);
  }, []);

  return {
    outline,
    loading,
    error,
    updatedAt,
    loadOutline,
    saveOutline,
    clear,
  };
}
