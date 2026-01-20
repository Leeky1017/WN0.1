import { create } from 'zustand';

import { useFilesStore } from './filesStore';
import { IpcError, fileOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

import type { EditorMode, SaveStatus } from '../types/editor';

type EditorState = {
  currentPath: string | null;
  content: string;
  editorMode: EditorMode;
  isDirty: boolean;
  isLoading: boolean;
  loadError: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  openFile: (path: string) => Promise<void>;
  setContent: (content: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  save: () => Promise<void>;
  closeFile: () => void;
};

function getFilesApi() {
  return fileOps;
}

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

let openSeq = 0;
let saveSeq = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  currentPath: null,
  content: '',
  editorMode: 'markdown',
  isDirty: false,
  isLoading: false,
  loadError: null,
  saveStatus: 'saved',
  lastSavedAt: null,

  openFile: async (path: string) => {
    const nextPath = typeof path === 'string' ? path : '';
    if (!nextPath) return;

    const { currentPath, isDirty } = get();
    if (currentPath && isDirty) {
      try {
        await get().save();
      } catch {
        // Ignore save errors when switching files; user can retry by editing again.
      }
    }

    const requestId = (openSeq += 1);
    set({
      currentPath: nextPath,
      content: '',
      editorMode: 'markdown',
      isDirty: false,
      isLoading: true,
      loadError: null,
      saveStatus: 'saved',
      lastSavedAt: null,
    });

    try {
      const result = await getFilesApi().read(nextPath);
      if (requestId !== openSeq) return;
      set({
        content: result.content ?? '',
        editorMode: 'markdown',
        isDirty: false,
        isLoading: false,
        loadError: null,
        saveStatus: 'saved',
      });
    } catch (error) {
      if (requestId !== openSeq) return;
      set({
        isLoading: false,
        loadError: toErrorMessage(error),
        saveStatus: 'error',
      });
    }
  },

  setContent: (content: string) => {
    set({
      content,
      isDirty: true,
    });
  },

  setEditorMode: (mode: EditorMode) => {
    set({ editorMode: mode });
  },

  save: async () => {
    const { currentPath, content } = get();
    if (!currentPath) return;

    const requestId = (saveSeq += 1);
    set({ saveStatus: 'saving' });

    try {
      await getFilesApi().write(currentPath, content);
      if (requestId !== saveSeq) return;
      set({
        isDirty: false,
        saveStatus: 'saved',
        lastSavedAt: Date.now(),
      });
      useFilesStore.getState().refresh().catch(() => undefined);
    } catch (error) {
      if (requestId !== saveSeq) return;
      set({ saveStatus: 'error' });
      throw error;
    }
  },

  closeFile: () => {
    set({
      currentPath: null,
      content: '',
      editorMode: 'markdown',
      isDirty: false,
      isLoading: false,
      loadError: null,
      saveStatus: 'saved',
      lastSavedAt: null,
    });
  },
}));
