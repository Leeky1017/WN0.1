import { create } from 'zustand';

import { useFilesStore } from './filesStore';
import { IpcError, fileOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

import type { EditorMode, SaveStatus } from '../types/editor';

type EditorState = {
  currentPath: string | null;
  content: string;
  editorMode: EditorMode;
  selection: { start: number; end: number } | null;
  isDirty: boolean;
  isLoading: boolean;
  loadError: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  pendingJumpLine: number | null;
  pendingJumpRange: { start: number; end: number } | null;
  openFile: (path: string) => Promise<void>;
  setContent: (content: string) => void;
  setSelection: (selection: { start: number; end: number } | null) => void;
  replaceRange: (range: { start: number; end: number }, replacement: string) => string;
  setEditorMode: (mode: EditorMode) => void;
  save: () => Promise<void>;
  requestJumpToLine: (line: number) => void;
  consumeJumpToLine: () => void;
  requestJumpToRange: (range: { start: number; end: number }) => void;
  consumeJumpToRange: () => void;
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

function clampRange(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > max) return max;
  return value;
}

function normalizeRange(range: { start: number; end: number }, contentLength: number): { start: number; end: number } {
  const start = clampRange(range.start, contentLength);
  const end = clampRange(range.end, contentLength);
  return end >= start ? { start, end } : { start: end, end: start };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentPath: null,
  content: '',
  editorMode: 'markdown',
  selection: null,
  isDirty: false,
  isLoading: false,
  loadError: null,
  saveStatus: 'saved',
  lastSavedAt: null,
  pendingJumpLine: null,
  pendingJumpRange: null,

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
      selection: null,
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
        selection: null,
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
    const next = typeof content === 'string' ? content : '';
    set((state) => ({
      content: next,
      selection: state.selection ? normalizeRange(state.selection, next.length) : state.selection,
      isDirty: true,
    }));
  },

  setSelection: (selection) => {
    const contentLength = get().content.length;
    if (!selection) {
      set({ selection: null });
      return;
    }
    set({ selection: normalizeRange(selection, contentLength) });
  },

  replaceRange: (range, replacement) => {
    const content = get().content;
    const normalized = normalizeRange(range, content.length);
    const safeReplacement = typeof replacement === 'string' ? replacement : '';
    const nextContent = content.slice(0, normalized.start) + safeReplacement + content.slice(normalized.end);
    const nextSelection = { start: normalized.start, end: normalized.start + safeReplacement.length };
    set({
      content: nextContent,
      selection: nextSelection,
      isDirty: true,
    });
    return nextContent;
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
      const projectId = useProjectsStore.getState().currentProjectId;
      await getFilesApi().write(currentPath, content, projectId ? { projectId } : undefined);
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

  requestJumpToLine: (line: number) => {
    const next = Number.isFinite(line) ? Math.max(1, Math.floor(line)) : null;
    if (!next) return;
    set({ pendingJumpLine: next });
  },

  consumeJumpToLine: () => {
    set({ pendingJumpLine: null });
  },

  /**
   * Why: search/outline navigation needs a deterministic way to focus and highlight a text match without coupling to UI refs.
   */
  requestJumpToRange: (range) => {
    const startRaw = typeof range?.start === 'number' ? range.start : Number(range?.start);
    const endRaw = typeof range?.end === 'number' ? range.end : Number(range?.end);
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) return;
    const start = Math.max(0, Math.floor(startRaw));
    const end = Math.max(0, Math.floor(endRaw));
    set({ pendingJumpRange: { start, end } });
  },

  consumeJumpToRange: () => {
    set({ pendingJumpRange: null });
  },

  closeFile: () => {
    set({
      currentPath: null,
      content: '',
      editorMode: 'markdown',
      selection: null,
      isDirty: false,
      isLoading: false,
      loadError: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      pendingJumpLine: null,
      pendingJumpRange: null,
    });
  },
}));
