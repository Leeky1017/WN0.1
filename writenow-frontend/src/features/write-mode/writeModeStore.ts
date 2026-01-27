/**
 * Write Mode store (SSOT for the active document content + save pipeline).
 *
 * Why: File open/save/autosave must be single-chain to avoid demo/stub divergence and prevent data loss.
 * This store owns the active markdown buffer and coordinates debounced saves via the real `file:*` channel.
 */

import { create } from 'zustand';

import { computeTextStats } from '@/lib/editor/text-stats';
import { RpcError, invoke } from '@/lib/rpc';
import { useEditorFilesStore } from '@/stores/editorFilesStore';
import { useStatusBarStore } from '@/stores/statusBarStore';
import type { SaveErrorInfo, SaveStatus } from '@/stores/statusBarStore';
import type { IpcError, IpcErrorCode } from '@/types/ipc-generated';

type SaveReason = 'auto' | 'manual' | 'retry';

const AUTO_SAVE_DEBOUNCE_MS = 1000;

function toIpcError(error: unknown): IpcError {
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; message?: unknown; details?: unknown; retryable?: unknown };
    if (typeof record.code === 'string' && typeof record.message === 'string') {
      return {
        code: record.code as IpcError['code'],
        message: record.message,
        ...(typeof record.details === 'undefined' ? {} : { details: record.details }),
        ...(typeof record.retryable === 'boolean' ? { retryable: record.retryable } : {}),
      };
    }
  }
  return { code: 'INTERNAL', message: error instanceof Error ? error.message : 'Unknown error', retryable: true };
}

function toSaveErrorInfo(error: IpcError): SaveErrorInfo {
  return { code: error.code as IpcErrorCode, message: error.message };
}

function setActiveSaveStatus(status: SaveStatus, error?: SaveErrorInfo | null): void {
  const { setSaveStatus } = useStatusBarStore.getState();
  setSaveStatus(status, error ?? null);
}

export interface WriteModeState {
  activeFilePath: string | null;
  /** Current markdown buffer for the active file. */
  markdown: string;
  /** Increment to force applying external content (open/restore). */
  contentVersion: number;

  isOpening: boolean;
  openError: IpcError | null;

  /** Open a file and load its markdown via `file:read`. */
  openFile: (path: string) => Promise<void>;

  /** Mark current file as dirty and schedule autosave. */
  updateMarkdown: (markdown: string) => void;

  /** Save immediately (manual/retry/forced). */
  saveNow: (reason?: SaveReason) => Promise<void>;

  /** Clear current save error (UI ack). */
  clearSaveError: () => void;
}

export const useWriteModeStore = create<WriteModeState>((set, get) => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saveInFlight: Promise<void> | null = null;
  let pendingResave = false;
  let lastSavedContent = '';
  let lastSavedPath: string | null = null;

  const clearSaveTimer = () => {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
  };

  const scheduleSave = () => {
    clearSaveTimer();
    saveTimer = setTimeout(() => {
      void get().saveNow('auto').catch(() => {
        // Why: save errors are surfaced via status stores; keep autosave best-effort without unhandled promises.
      });
    }, AUTO_SAVE_DEBOUNCE_MS);
  };

  const setDirtyForActiveFile = (isDirty: boolean, saveStatus: SaveStatus) => {
    const path = get().activeFilePath;
    if (!path) return;
    useEditorFilesStore.getState().upsert(path, { isDirty, saveStatus });
  };

  const setStats = (markdown: string) => {
    const stats = computeTextStats(markdown);
    const { setWordCount, setCharCount } = useStatusBarStore.getState();
    setWordCount(stats.words);
    setCharCount(stats.chars);
  };

  const saveNow = async (reason: SaveReason = 'manual') => {
    void reason;
    clearSaveTimer();

    const { activeFilePath, markdown } = get();
    if (!activeFilePath) return;

    const { isConnected } = useStatusBarStore.getState();
    if (!isConnected) {
      const error: IpcError = { code: 'INTERNAL', message: '未连接到后端，无法保存', retryable: true };
      setActiveSaveStatus('error', toSaveErrorInfo(error));
      setDirtyForActiveFile(true, 'error');
      throw RpcError.fromIpcError(error);
    }

    if (saveInFlight) {
      pendingResave = true;
      return saveInFlight;
    }

    // Skip when nothing changed since last successful save for this file.
    if (lastSavedPath === activeFilePath && lastSavedContent === markdown) {
      setActiveSaveStatus('saved');
      setDirtyForActiveFile(false, 'saved');
      return;
    }

    setActiveSaveStatus('saving');
    setDirtyForActiveFile(true, 'saving');

    const doSave = (async () => {
      try {
        await invoke('file:write', { path: activeFilePath, content: markdown, encoding: 'utf8' });
        lastSavedPath = activeFilePath;
        lastSavedContent = markdown;

        setActiveSaveStatus('saved');
        setDirtyForActiveFile(false, 'saved');
        useStatusBarStore.getState().setLastSavedAt(Date.now());
      } catch (error) {
        const ipc = toIpcError(error);
        setActiveSaveStatus('error', toSaveErrorInfo(ipc));
        setDirtyForActiveFile(true, 'error');
        throw error;
      } finally {
        saveInFlight = null;
      }
    })();

    saveInFlight = doSave;

    try {
      await doSave;
    } finally {
      // If changes were made while saving, ensure we flush the latest buffer.
      if (pendingResave) {
        pendingResave = false;
        const current = get();
        if (current.activeFilePath && (lastSavedPath !== current.activeFilePath || lastSavedContent !== current.markdown)) {
          // Chain without debounce to converge quickly after a long I/O.
          await saveNow('auto');
        }
      }
    }
  };

  return {
    activeFilePath: null,
    markdown: '',
    contentVersion: 0,
    isOpening: false,
    openError: null,

    openFile: async (rawPath: string) => {
      const path = rawPath.trim();
      if (!path) return;

      clearSaveTimer();

      const currentPath = get().activeFilePath;
      if (currentPath && currentPath !== path) {
        const dirty = useEditorFilesStore.getState().byPath[currentPath]?.isDirty ?? false;
        if (dirty) {
          // Why: Prevent data loss when switching files. If save fails, keep the user on the current file.
          await saveNow('manual');
        }
      }

      set({ isOpening: true, openError: null });

      try {
        const res = await invoke('file:read', { path });
        const content = res.content ?? '';

        lastSavedPath = path;
        lastSavedContent = content;

        setStats(content);
        useEditorFilesStore.getState().upsert(path, { isDirty: false, saveStatus: 'saved' });
        setActiveSaveStatus('saved');

        set((state) => ({
          activeFilePath: path,
          markdown: content,
          contentVersion: state.contentVersion + 1,
          isOpening: false,
          openError: null,
        }));
      } catch (error) {
        const ipc = toIpcError(error);
        setActiveSaveStatus('error', toSaveErrorInfo(ipc));
        set({ isOpening: false, openError: ipc });
        throw error;
      }
    },

    updateMarkdown: (markdown) => {
      const next = typeof markdown === 'string' ? markdown : '';
      set({ markdown: next });
      setStats(next);

      const path = get().activeFilePath;
      if (!path) return;

      // Mark dirty + schedule save.
      useEditorFilesStore.getState().upsert(path, { isDirty: true, saveStatus: 'unsaved' });
      setActiveSaveStatus('unsaved');

      if (saveInFlight) {
        pendingResave = true;
      }
      scheduleSave();
    },

    saveNow,

    clearSaveError: () => {
      const { saveStatus } = useStatusBarStore.getState();
      if (saveStatus !== 'error') return;
      setActiveSaveStatus('unsaved', null);
    },
  };
});

