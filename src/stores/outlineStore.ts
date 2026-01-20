import { create } from 'zustand';

import { IpcError, outlineOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

import type { OutlineNode } from '../types/ipc';

export type OutlineSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type OutlineState = {
  articleId: string | null;
  outline: OutlineNode[];
  isDirty: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  saveStatus: OutlineSaveStatus;
  lastSavedAt: number | null;
  loadOutline: (articleId: string, fallback?: OutlineNode[]) => Promise<void>;
  setOutline: (outline: OutlineNode[]) => void;
  saveOutline: (articleId: string, outline: OutlineNode[]) => Promise<void>;
  clear: () => void;
};

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getCurrentProjectId() {
  return useProjectsStore.getState().currentProjectId;
}

export const useOutlineStore = create<OutlineState>((set) => ({
  articleId: null,
  outline: [],
  isDirty: false,
  isLoading: false,
  hasLoaded: false,
  error: null,
  saveStatus: 'idle',
  lastSavedAt: null,

  loadOutline: async (articleId: string, fallback?: OutlineNode[]) => {
    const projectId = getCurrentProjectId();
    const normalizedArticleId = typeof articleId === 'string' ? articleId.trim() : '';
    if (!projectId || !normalizedArticleId) {
      set({
        articleId: normalizedArticleId || null,
        outline: fallback ?? [],
        isDirty: false,
        isLoading: false,
        hasLoaded: true,
        error: null,
        saveStatus: 'idle',
        lastSavedAt: null,
      });
      return;
    }

    set({ isLoading: true, error: null, saveStatus: 'idle' });
    try {
      const result = await outlineOps.get({ projectId, articleId: normalizedArticleId });
      const resolved = result.outline ?? (fallback ?? []);
      set({
        articleId: normalizedArticleId,
        outline: resolved,
        isDirty: result.outline ? false : resolved.length > 0,
        isLoading: false,
        hasLoaded: true,
        error: null,
        saveStatus: 'idle',
        lastSavedAt: null,
      });
    } catch (error) {
      set({
        articleId: normalizedArticleId,
        outline: fallback ?? [],
        isDirty: false,
        isLoading: false,
        hasLoaded: true,
        error: toErrorMessage(error),
        saveStatus: 'error',
      });
    }
  },

  setOutline: (outline: OutlineNode[]) => {
    set({ outline, isDirty: true, saveStatus: 'idle' });
  },

  saveOutline: async (articleId: string, outline: OutlineNode[]) => {
    const projectId = getCurrentProjectId();
    const normalizedArticleId = typeof articleId === 'string' ? articleId.trim() : '';
    if (!projectId || !normalizedArticleId) return;

    set({ saveStatus: 'saving', error: null });
    try {
      await outlineOps.save({ projectId, articleId: normalizedArticleId, outline });
      set({ saveStatus: 'saved', lastSavedAt: Date.now(), error: null, isDirty: false });
    } catch (error) {
      set({ saveStatus: 'error', error: toErrorMessage(error) });
      throw error;
    }
  },

  clear: () => {
    set({
      articleId: null,
      outline: [],
      isDirty: false,
      isLoading: false,
      hasLoaded: false,
      error: null,
      saveStatus: 'idle',
      lastSavedAt: null,
    });
  },
}));
