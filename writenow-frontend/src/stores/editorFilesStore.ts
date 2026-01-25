/**
 * Editor files store
 * Why: FlexLayout handles tabs, but we still need a stable, typed source of truth for per-file dirty/save state
 * so the layout can (1) show dirty markers and (2) block closing unsaved tabs.
 */

import { create } from 'zustand';

import type { SaveStatus } from './statusBarStore';

export interface EditorFileState {
  path: string;
  isDirty: boolean;
  saveStatus: SaveStatus;
}

export interface EditorFilesState {
  byPath: Record<string, EditorFileState | undefined>;

  upsert: (path: string, patch: Partial<Omit<EditorFileState, 'path'>>) => void;
  remove: (path: string) => void;
  getDirty: (path: string) => boolean;
}

export const useEditorFilesStore = create<EditorFilesState>((set, get) => ({
  byPath: {},

  upsert: (path, patch) => {
    const normalized = path.trim();
    if (!normalized) return;

    set((state) => {
      const prev = state.byPath[normalized];
      const next: EditorFileState = {
        path: normalized,
        isDirty: prev?.isDirty ?? false,
        saveStatus: prev?.saveStatus ?? 'saved',
        ...patch,
      };
      return {
        byPath: {
          ...state.byPath,
          [normalized]: next,
        },
      };
    });
  },

  remove: (path) => {
    const normalized = path.trim();
    if (!normalized) return;
    set((state) => {
      const next = { ...state.byPath };
      delete next[normalized];
      return { byPath: next };
    });
  },

  getDirty: (path) => {
    const normalized = path.trim();
    return Boolean(get().byPath[normalized]?.isDirty);
  },
}));

