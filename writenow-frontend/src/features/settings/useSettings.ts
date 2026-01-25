/**
 * useSettings
 * Why: Provide a thin, typed facade for SettingsPanel to read/update persisted settings (local + backend).
 */

import { useCallback, useEffect, useState } from 'react';

import { useElectronApi } from '@/lib/electron/useElectronApi';
import { invoke } from '@/lib/rpc';
import { useEditorModeStore, useThemeStore } from '@/stores';
import type { MemorySettings } from '@/types/ipc-generated';
import type { Theme } from '@/lib/theme/themeManager';
import type { ElectronAPI } from '@/types/electron-api';

const AI_KEY_STORAGE_KEY = 'writenow_ai_api_key_v1';

function getLocalAiKey(): string {
  return localStorage.getItem(AI_KEY_STORAGE_KEY) ?? '';
}

function setLocalAiKey(value: string): void {
  localStorage.setItem(AI_KEY_STORAGE_KEY, value);
}

async function getEncryptedAiKey(electronApi: ElectronAPI | null): Promise<string> {
  if (electronApi?.secureStore?.get) {
    const value = await electronApi.secureStore.get(AI_KEY_STORAGE_KEY);
    return value ?? '';
  }
  return getLocalAiKey();
}

async function setEncryptedAiKey(electronApi: ElectronAPI | null, value: string): Promise<void> {
  if (electronApi?.secureStore?.set) {
    await electronApi.secureStore.set(AI_KEY_STORAGE_KEY, value);
    return;
  }
  setLocalAiKey(value);
}

export interface UseSettingsResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;

  defaultEditorMode: 'richtext' | 'markdown';
  setDefaultEditorMode: (mode: 'richtext' | 'markdown') => void;

  aiApiKey: string;
  setAiApiKey: (value: string) => Promise<void>;

  memorySettings: MemorySettings | null;
  memoryLoading: boolean;
  memoryError: string | null;
  updateMemorySettings: (patch: Partial<MemorySettings>) => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const defaultEditorMode = useEditorModeStore((s) => s.mode);
  const setDefaultEditorMode = useEditorModeStore((s) => s.setDefaultMode);

  const electronApi = useElectronApi();
  const [aiApiKey, setAiApiKeyState] = useState('');
  const [memorySettings, setMemorySettings] = useState<MemorySettings | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  useEffect(() => {
    void getEncryptedAiKey(electronApi)
      .then((value) => setAiApiKeyState(value))
      .catch(() => {
        // Why: Key is optional; keep empty when unreadable.
        setAiApiKeyState('');
      });
  }, [electronApi]);

  const setAiApiKey = useCallback(async (value: string) => {
    try {
      await setEncryptedAiKey(electronApi, value);
    } catch {
      // Why: Electron secure storage may be unavailable; fall back to local storage to keep UX unblocked.
      setLocalAiKey(value);
    }
    setAiApiKeyState(value);
  }, [electronApi]);

  const loadMemory = useCallback(async () => {
    setMemoryLoading(true);
    setMemoryError(null);
    try {
      const res = await invoke('memory:settings:get', {});
      setMemorySettings(res.settings);
    } catch (error) {
      setMemoryError(error instanceof Error ? error.message : 'Failed to load memory settings');
      setMemorySettings(null);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemory();
  }, [loadMemory]);

  const updateMemorySettings = useCallback(
    async (patch: Partial<MemorySettings>) => {
      setMemoryError(null);
      try {
        const res = await invoke('memory:settings:update', patch);
        setMemorySettings(res.settings);
      } catch (error) {
        setMemoryError(error instanceof Error ? error.message : 'Failed to update memory settings');
      }
    },
    [],
  );

  return {
    theme,
    setTheme,
    defaultEditorMode,
    setDefaultEditorMode,
    aiApiKey,
    setAiApiKey,
    memorySettings,
    memoryLoading,
    memoryError,
    updateMemorySettings,
  };
}

export default useSettings;
