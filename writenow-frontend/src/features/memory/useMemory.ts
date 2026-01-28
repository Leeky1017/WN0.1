/**
 * useMemory hook
 * Why: Centralize memory CRUD operations with proper loading/error states.
 */

import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@/lib/rpc';
import type {
  UserMemory,
  UserMemoryType,
  MemorySettings,
  MemoryInjectionPreviewResponse,
} from '@/types/ipc-generated';

export interface UseMemoryResult {
  memories: UserMemory[];
  loading: boolean;
  error: string | null;

  settings: MemorySettings | null;
  settingsLoading: boolean;

  injectionPreview: MemoryInjectionPreviewResponse | null;
  injectionPreviewLoading: boolean;

  refresh: () => Promise<void>;
  create: (type: UserMemoryType, content: string, projectId?: string | null) => Promise<UserMemory | null>;
  update: (id: string, patch: { type?: UserMemoryType; content?: string }) => Promise<UserMemory | null>;
  remove: (id: string) => Promise<boolean>;
  clearLearned: () => Promise<number>;

  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<MemorySettings>) => Promise<void>;

  loadInjectionPreview: (projectId?: string) => Promise<void>;
}

export function useMemory(): UseMemoryResult {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [injectionPreview, setInjectionPreview] = useState<MemoryInjectionPreviewResponse | null>(null);
  const [injectionPreviewLoading, setInjectionPreviewLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke('memory:list', { includeLearned: true });
      setMemories(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (
    type: UserMemoryType,
    content: string,
    projectId?: string | null,
  ): Promise<UserMemory | null> => {
    setError(null);
    try {
      const res = await invoke('memory:create', { type, content, projectId: projectId ?? null });
      setMemories((prev) => [res.item, ...prev]);
      return res.item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory');
      return null;
    }
  }, []);

  const update = useCallback(async (
    id: string,
    patch: { type?: UserMemoryType; content?: string },
  ): Promise<UserMemory | null> => {
    setError(null);
    try {
      const res = await invoke('memory:update', { id, ...patch });
      setMemories((prev) => prev.map((m) => (m.id === id ? res.item : m)));
      return res.item;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update memory');
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await invoke('memory:delete', { id });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
      return false;
    }
  }, []);

  const clearLearned = useCallback(async (): Promise<number> => {
    setError(null);
    try {
      const res = await invoke('memory:preferences:clear', { scope: 'learned' });
      await refresh();
      return res.deletedCount;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear learned memories');
      return 0;
    }
  }, [refresh]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await invoke('memory:settings:get', {});
      setSettings(res.settings);
    } catch (err) {
      console.error('[Memory] Failed to load settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (patch: Partial<MemorySettings>) => {
    try {
      const res = await invoke('memory:settings:update', patch);
      setSettings(res.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  }, []);

  const loadInjectionPreview = useCallback(async (projectId?: string) => {
    setInjectionPreviewLoading(true);
    try {
      const res = await invoke('memory:injection:preview', { projectId });
      setInjectionPreview(res);
    } catch (err) {
      console.error('[Memory] Failed to load injection preview:', err);
      setInjectionPreview(null);
    } finally {
      setInjectionPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void loadSettings();
  }, [refresh, loadSettings]);

  return {
    memories,
    loading,
    error,
    settings,
    settingsLoading,
    injectionPreview,
    injectionPreviewLoading,
    refresh,
    create,
    update,
    remove,
    clearLearned,
    loadSettings,
    updateSettings,
    loadInjectionPreview,
  };
}

export default useMemory;
