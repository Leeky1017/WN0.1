/**
 * Editor mode store
 * Why: Support Sprint Frontend V2 dual-mode editor (richtext <-> markdown) with a persistent default.
 */

import { create } from 'zustand';

export type EditorMode = 'richtext' | 'markdown';

const STORAGE_KEY = 'writenow-editor-default-mode';

function loadDefaultMode(): EditorMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'markdown' ? 'markdown' : 'richtext';
}

function persistDefaultMode(mode: EditorMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    // Why: Mode persistence is non-critical; editor must still function without storage.
    console.warn('[EditorMode] Failed to persist default mode:', error);
  }
}

export interface EditorModeState {
  /** Current mode for the active editor instance (UI-level). */
  mode: EditorMode;
  /** User preference used when opening new editors. */
  defaultMode: EditorMode;

  setMode: (mode: EditorMode) => void;
  setDefaultMode: (mode: EditorMode) => void;
}

export const useEditorModeStore = create<EditorModeState>((set) => {
  const defaultMode = loadDefaultMode();
  return {
    mode: defaultMode,
    defaultMode,
    setMode: (mode) => set({ mode }),
    setDefaultMode: (mode) => {
      persistDefaultMode(mode);
      set({ defaultMode: mode, mode });
    },
  };
});
