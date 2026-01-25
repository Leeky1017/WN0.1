/**
 * Editor runtime store
 * Why: The AI panel needs access to the current editor selection and a safe way to apply accepted diffs back
 * into the active TipTap editor instance.
 *
 * Note: This store intentionally holds non-serializable objects (TipTap Editor). It is runtime-only UI state.
 */

import { create } from 'zustand';
import type { Editor } from '@tiptap/core';

export interface EditorSelectionSnapshot {
  filePath: string;
  from: number;
  to: number;
  text: string;
  updatedAt: number;
}

export interface EditorRuntimeState {
  activeFilePath: string | null;
  activeEditor: Editor | null;
  selection: EditorSelectionSnapshot | null;

  setActiveEditor: (filePath: string, editor: Editor | null) => void;
  setSelection: (selection: EditorSelectionSnapshot | null) => void;
  clearForFile: (filePath: string) => void;
}

export const useEditorRuntimeStore = create<EditorRuntimeState>((set, get) => ({
  activeFilePath: null,
  activeEditor: null,
  selection: null,

  setActiveEditor: (filePath, editor) => {
    const normalized = filePath.trim();
    if (!normalized) return;
    set({ activeFilePath: normalized, activeEditor: editor });
  },

  setSelection: (selection) => set({ selection }),

  clearForFile: (filePath) => {
    const normalized = filePath.trim();
    if (!normalized) return;
    const state = get();
    const next: Partial<EditorRuntimeState> = {};
    if (state.activeFilePath === normalized) {
      next.activeFilePath = null;
      next.activeEditor = null;
    }
    if (state.selection?.filePath === normalized) {
      next.selection = null;
    }
    set(next);
  },
}));

