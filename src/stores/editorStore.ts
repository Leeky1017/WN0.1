import { create } from 'zustand';

import { useFilesStore } from './filesStore';
import { IpcError, fileOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

import type { EditorMode, SaveStatus } from '../types/editor';

export type EditorTabId = string;

export type EditorTab = {
  id: EditorTabId;
  path: string;
};

type TabScrollState = {
  editorScrollTop: number;
  previewScrollTop: number;
};

type EditorTabState = {
  path: string;
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
  openRequestId: number;
  saveRequestId: number;
};

type EditorState = {
  openTabs: EditorTab[];
  activeTabId: EditorTabId | null;
  dirtyMap: Record<EditorTabId, boolean>;
  scrollMap: Record<EditorTabId, TabScrollState>;
  tabStateById: Record<EditorTabId, EditorTabState>;

  /**
   * Why: a single entry point for multi-tab opening avoids "dual stack" behaviors
   * and makes tab state (dirty/scroll) recoverable per document.
   */
  openFile: (path: string) => Promise<void>;
  /**
   * Why: explicit activation keeps tab switching side-effect free (no implicit save/discard).
   */
  activateTab: (tabId: EditorTabId) => void;
  /**
   * Why: tab ordering is user intent and must be stable across interactions (drag/drop).
   */
  reorderTabs: (fromTabId: EditorTabId, toTabId: EditorTabId) => void;
  /**
   * Why: allow programmatic closes (file delete/project switch) without leaking UI decisions into the store.
   */
  closeTab: (tabId: EditorTabId) => void;
  closeOtherTabs: (tabId: EditorTabId) => void;
  closeSavedTabs: () => void;
  closeFile: () => void;
  closeAllTabs: () => void;
  setTabScroll: (tabId: EditorTabId, scroll: TabScrollState) => void;

  setContent: (content: string) => void;
  setSelection: (selection: { start: number; end: number } | null) => void;
  replaceRange: (range: { start: number; end: number }, replacement: string) => string;
  setEditorMode: (mode: EditorMode) => void;
  save: (tabId?: EditorTabId) => Promise<void>;
  requestJumpToLine: (line: number) => void;
  consumeJumpToLine: () => void;
  requestJumpToRange: (range: { start: number; end: number }) => void;
  consumeJumpToRange: () => void;
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

function normalizeTabId(value: unknown): EditorTabId {
  return typeof value === 'string' ? value.trim() : '';
}

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
  openTabs: [],
  activeTabId: null,
  dirtyMap: {},
  scrollMap: {},
  tabStateById: {},

  openFile: async (path: string) => {
    const nextPath = typeof path === 'string' ? path.trim() : '';
    if (!nextPath) return;

    const existing = get().openTabs.find((tab) => tab.path === nextPath);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const tabId = nextPath;
    const requestId = (openSeq += 1);

    set((state) => ({
      openTabs: [...state.openTabs, { id: tabId, path: nextPath }],
      activeTabId: tabId,
      dirtyMap: { ...state.dirtyMap, [tabId]: false },
      scrollMap: {
        ...state.scrollMap,
        [tabId]: {
          editorScrollTop: 0,
          previewScrollTop: 0,
        },
      },
      tabStateById: {
        ...state.tabStateById,
        [tabId]: {
          path: nextPath,
          content: '',
          editorMode: 'markdown',
          selection: null,
          isDirty: false,
          isLoading: true,
          loadError: null,
          saveStatus: 'saved',
          lastSavedAt: null,
          pendingJumpLine: null,
          pendingJumpRange: null,
          openRequestId: requestId,
          saveRequestId: 0,
        },
      },
    }));

    try {
      const result = await getFilesApi().read(nextPath);
      set((state) => {
        const current = state.tabStateById[tabId];
        if (!current) return {};
        if (current.openRequestId !== requestId) return {};

        return {
          tabStateById: {
            ...state.tabStateById,
            [tabId]: {
              ...current,
              content: result.content ?? '',
              editorMode: 'markdown',
              selection: null,
              isDirty: false,
              isLoading: false,
              loadError: null,
              saveStatus: 'saved',
            },
          },
          dirtyMap: { ...state.dirtyMap, [tabId]: false },
        };
      });
    } catch (error) {
      set((state) => {
        const current = state.tabStateById[tabId];
        if (!current) return {};
        if (current.openRequestId !== requestId) return {};
        return {
          tabStateById: {
            ...state.tabStateById,
            [tabId]: {
              ...current,
              isLoading: false,
              loadError: toErrorMessage(error),
              saveStatus: 'error',
            },
          },
        };
      });
    }
  },

  activateTab: (tabId) => {
    const id = normalizeTabId(tabId);
    if (!id) return;
    set((state) => {
      if (state.activeTabId === id) return {};
      if (!state.tabStateById[id]) return {};
      return { activeTabId: id };
    });
  },

  reorderTabs: (fromTabId, toTabId) => {
    const fromId = normalizeTabId(fromTabId);
    const toId = normalizeTabId(toTabId);
    if (!fromId || !toId || fromId === toId) return;

    set((state) => {
      const fromIndex = state.openTabs.findIndex((tab) => tab.id === fromId);
      const toIndex = state.openTabs.findIndex((tab) => tab.id === toId);
      if (fromIndex < 0 || toIndex < 0) return {};

      const next = [...state.openTabs];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      next.splice(insertAt, 0, moved);
      return { openTabs: next };
    });
  },

  closeTab: (tabId) => {
    const id = normalizeTabId(tabId);
    if (!id) return;

    set((state) => {
      const index = state.openTabs.findIndex((tab) => tab.id === id);
      if (index < 0) return {};

      const nextOpenTabs = state.openTabs.filter((tab) => tab.id !== id);
      const nextDirtyMap = { ...state.dirtyMap };
      const nextScrollMap = { ...state.scrollMap };
      const nextTabStateById = { ...state.tabStateById };

      delete nextDirtyMap[id];
      delete nextScrollMap[id];
      delete nextTabStateById[id];

      let nextActive = state.activeTabId;
      if (state.activeTabId === id) {
        const candidate = nextOpenTabs[index] ?? nextOpenTabs[index - 1] ?? null;
        nextActive = candidate ? candidate.id : null;
      }

      return {
        openTabs: nextOpenTabs,
        activeTabId: nextActive,
        dirtyMap: nextDirtyMap,
        scrollMap: nextScrollMap,
        tabStateById: nextTabStateById,
      };
    });
  },

  closeOtherTabs: (tabId) => {
    const id = normalizeTabId(tabId);
    if (!id) return;

    set((state) => {
      const keep = state.openTabs.find((tab) => tab.id === id);
      const keepState = state.tabStateById[id];
      if (!keep || !keepState) return {};

      return {
        openTabs: [keep],
        activeTabId: id,
        dirtyMap: { [id]: Boolean(state.dirtyMap[id]) },
        scrollMap: {
          [id]: state.scrollMap[id] ?? { editorScrollTop: 0, previewScrollTop: 0 },
        },
        tabStateById: { [id]: keepState },
      };
    });
  },

  closeSavedTabs: () => {
    set((state) => {
      if (state.openTabs.length === 0) return {};
      const idsToClose = state.openTabs.filter((tab) => !state.dirtyMap[tab.id]).map((tab) => tab.id);
      if (idsToClose.length === 0) return {};

      const idsToCloseSet = new Set(idsToClose);
      const nextOpenTabs = state.openTabs.filter((tab) => !idsToCloseSet.has(tab.id));

      const nextDirtyMap: Record<EditorTabId, boolean> = {};
      const nextScrollMap: Record<EditorTabId, TabScrollState> = {};
      const nextTabStateById: Record<EditorTabId, EditorTabState> = {};

      for (const tab of nextOpenTabs) {
        const id = tab.id;
        const tabState = state.tabStateById[id];
        if (!tabState) continue;
        nextDirtyMap[id] = Boolean(state.dirtyMap[id]);
        nextScrollMap[id] = state.scrollMap[id] ?? { editorScrollTop: 0, previewScrollTop: 0 };
        nextTabStateById[id] = tabState;
      }

      const activeStillOpen = state.activeTabId && nextTabStateById[state.activeTabId];
      const nextActive = activeStillOpen ? state.activeTabId : nextOpenTabs[0]?.id ?? null;

      return {
        openTabs: nextOpenTabs,
        activeTabId: nextActive,
        dirtyMap: nextDirtyMap,
        scrollMap: nextScrollMap,
        tabStateById: nextTabStateById,
      };
    });
  },

  closeFile: () => {
    const active = get().activeTabId;
    if (!active) return;
    get().closeTab(active);
  },

  closeAllTabs: () => {
    set({
      openTabs: [],
      activeTabId: null,
      dirtyMap: {},
      scrollMap: {},
      tabStateById: {},
    });
  },

  setTabScroll: (tabId, scroll) => {
    const id = normalizeTabId(tabId);
    if (!id) return;

    const nextScroll: TabScrollState = {
      editorScrollTop: Number.isFinite(scroll.editorScrollTop) ? Math.max(0, Math.floor(scroll.editorScrollTop)) : 0,
      previewScrollTop: Number.isFinite(scroll.previewScrollTop) ? Math.max(0, Math.floor(scroll.previewScrollTop)) : 0,
    };

    set((state) => {
      if (!state.tabStateById[id]) return {};
      return { scrollMap: { ...state.scrollMap, [id]: nextScroll } };
    });
  },

  setContent: (content: string) => {
    const active = get().activeTabId;
    if (!active) return;

    const next = typeof content === 'string' ? content : '';
    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};
      return {
        tabStateById: {
          ...state.tabStateById,
          [active]: {
            ...current,
            content: next,
            selection: current.selection ? normalizeRange(current.selection, next.length) : current.selection,
            isDirty: true,
          },
        },
        dirtyMap: { ...state.dirtyMap, [active]: true },
      };
    });
  },

  setSelection: (selection) => {
    const active = get().activeTabId;
    if (!active) return;

    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};

      if (!selection) {
        return {
          tabStateById: { ...state.tabStateById, [active]: { ...current, selection: null } },
        };
      }

      return {
        tabStateById: {
          ...state.tabStateById,
          [active]: {
            ...current,
            selection: normalizeRange(selection, current.content.length),
          },
        },
      };
    });
  },

  replaceRange: (range, replacement) => {
    const active = get().activeTabId;
    if (!active) return '';

    const current = get().tabStateById[active];
    if (!current) return '';

    const normalized = normalizeRange(range, current.content.length);
    const safeReplacement = typeof replacement === 'string' ? replacement : '';
    const nextContent = current.content.slice(0, normalized.start) + safeReplacement + current.content.slice(normalized.end);
    const nextSelection = { start: normalized.start, end: normalized.start + safeReplacement.length };

    set((state) => {
      const latest = state.tabStateById[active];
      if (!latest) return {};
      return {
        tabStateById: {
          ...state.tabStateById,
          [active]: {
            ...latest,
            content: nextContent,
            selection: nextSelection,
            isDirty: true,
          },
        },
        dirtyMap: { ...state.dirtyMap, [active]: true },
      };
    });

    return nextContent;
  },

  setEditorMode: (mode: EditorMode) => {
    const active = get().activeTabId;
    if (!active) return;

    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};
      return {
        tabStateById: { ...state.tabStateById, [active]: { ...current, editorMode: mode } },
      };
    });
  },

  save: async (tabId?: EditorTabId) => {
    const id = tabId ? normalizeTabId(tabId) : get().activeTabId;
    if (!id) return;

    const tab = get().tabStateById[id];
    if (!tab) return;

    const requestId = (saveSeq += 1);
    set((state) => {
      const current = state.tabStateById[id];
      if (!current) return {};
      return {
        tabStateById: {
          ...state.tabStateById,
          [id]: {
            ...current,
            saveStatus: 'saving',
            saveRequestId: requestId,
          },
        },
      };
    });

    try {
      const projectId = useProjectsStore.getState().currentProjectId;
      await getFilesApi().write(tab.path, tab.content, projectId ? { projectId } : undefined);

      set((state) => {
        const current = state.tabStateById[id];
        if (!current) return {};
        if (current.saveRequestId !== requestId) return {};
        return {
          tabStateById: {
            ...state.tabStateById,
            [id]: {
              ...current,
              isDirty: false,
              saveStatus: 'saved',
              lastSavedAt: Date.now(),
            },
          },
          dirtyMap: { ...state.dirtyMap, [id]: false },
        };
      });
      useFilesStore.getState().refresh().catch(() => undefined);
    } catch (error) {
      set((state) => {
        const current = state.tabStateById[id];
        if (!current) return {};
        if (current.saveRequestId !== requestId) return {};
        return {
          tabStateById: {
            ...state.tabStateById,
            [id]: {
              ...current,
              saveStatus: 'error',
            },
          },
        };
      });
      throw error;
    }
  },

  requestJumpToLine: (line: number) => {
    const next = Number.isFinite(line) ? Math.max(1, Math.floor(line)) : null;
    if (!next) return;
    const active = get().activeTabId;
    if (!active) return;

    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};
      return {
        tabStateById: { ...state.tabStateById, [active]: { ...current, pendingJumpLine: next } },
      };
    });
  },

  consumeJumpToLine: () => {
    const active = get().activeTabId;
    if (!active) return;

    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};
      if (!current.pendingJumpLine) return {};
      return {
        tabStateById: { ...state.tabStateById, [active]: { ...current, pendingJumpLine: null } },
      };
    });
  },

  /**
   * Why: search/outline navigation needs a deterministic way to focus and highlight a text match without coupling to UI refs.
   */
  requestJumpToRange: (range) => {
    const startRaw = typeof range?.start === 'number' ? range.start : Number(range?.start);
    const endRaw = typeof range?.end === 'number' ? range.end : Number(range?.end);
    if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) return;

    const active = get().activeTabId;
    if (!active) return;

    const start = Math.max(0, Math.floor(startRaw));
    const end = Math.max(0, Math.floor(endRaw));

    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};
      return {
        tabStateById: {
          ...state.tabStateById,
          [active]: { ...current, pendingJumpRange: { start, end } },
        },
      };
    });
  },

  consumeJumpToRange: () => {
    const active = get().activeTabId;
    if (!active) return;

    set((state) => {
      const current = state.tabStateById[active];
      if (!current) return {};
      if (!current.pendingJumpRange) return {};
      return {
        tabStateById: { ...state.tabStateById, [active]: { ...current, pendingJumpRange: null } },
      };
    });
  },
}));
