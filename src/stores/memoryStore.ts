import { create } from 'zustand';

import { IpcError, memoryOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

import type { MemorySettings, UserMemory, UserMemoryType } from '../types/ipc';

export type MemoryScope = 'all' | 'global' | 'project';

export type MemoryFilter = {
  scope: MemoryScope;
  type: UserMemoryType | 'all';
  includeLearned: boolean;
};

type MemoryDraft = {
  type: UserMemoryType;
  content: string;
  scope: 'global' | 'project';
};

type MemoryPatch = {
  id: string;
  type?: UserMemoryType;
  content?: string;
  scope?: 'global' | 'project';
};

type MemoryState = {
  items: UserMemory[];
  injectedPreview: UserMemory[];
  settings: MemorySettings | null;

  filter: MemoryFilter;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  updateFilter: (patch: Partial<MemoryFilter>) => void;

  createMemory: (draft: MemoryDraft) => Promise<UserMemory | null>;
  updateMemory: (patch: MemoryPatch) => Promise<UserMemory | null>;
  deleteMemory: (id: string) => Promise<void>;

  updateSettings: (patch: Partial<MemorySettings>) => Promise<void>;
  clearLearnedPreferences: () => Promise<void>;
  refreshInjectionPreview: () => Promise<void>;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getCurrentProjectId(): string | null {
  return useProjectsStore.getState().currentProjectId;
}

function toProjectId(scope: 'global' | 'project', currentProjectId: string | null): string | null {
  if (scope === 'global') return null;
  return currentProjectId;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  items: [],
  injectedPreview: [],
  settings: null,

  filter: { scope: 'all', type: 'all', includeLearned: true },
  isLoading: false,
  hasLoaded: false,
  error: null,

  updateFilter: (patch) => {
    set((state) => ({ filter: { ...state.filter, ...patch } }));
  },

  refresh: async () => {
    const projectId = getCurrentProjectId();
    const filter = get().filter;
    const scope = filter.scope;

    set({ isLoading: true, error: null });
    try {
      const [settingsRes, listRes, previewRes] = await Promise.all([
        memoryOps.getSettings(),
        memoryOps.list({
          ...(projectId ? { projectId } : {}),
          scope,
          ...(filter.type !== 'all' ? { type: filter.type } : {}),
          includeGlobal: true,
          includeLearned: filter.includeLearned,
          limit: 200,
        }),
        memoryOps.previewInjection(projectId ? { projectId } : {}),
      ]);

      set({
        settings: settingsRes.settings,
        items: listRes.items,
        injectedPreview: previewRes.injected.memory,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  refreshInjectionPreview: async () => {
    const projectId = getCurrentProjectId();
    try {
      const res = await memoryOps.previewInjection(projectId ? { projectId } : {});
      set({ injectedPreview: res.injected.memory });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  createMemory: async (draft) => {
    const projectId = getCurrentProjectId();
    const targetProjectId = toProjectId(draft.scope, projectId);
    if (draft.scope === 'project' && !targetProjectId) {
      set({ error: '请选择项目后再创建项目级记忆' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const created = await memoryOps.create({
        type: draft.type,
        content: draft.content,
        projectId: targetProjectId,
      });
      await get().refresh();
      return created.item;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  updateMemory: async (patch) => {
    const projectId = getCurrentProjectId();
    const targetProjectId = typeof patch.scope === 'string' ? toProjectId(patch.scope, projectId) : undefined;
    if (patch.scope === 'project' && !targetProjectId) {
      set({ error: '请选择项目后再设置为项目级记忆' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const updated = await memoryOps.update({
        id: patch.id,
        ...(typeof patch.type === 'string' ? { type: patch.type } : {}),
        ...(typeof patch.content === 'string' ? { content: patch.content } : {}),
        ...(typeof targetProjectId !== 'undefined' ? { projectId: targetProjectId } : {}),
      });
      await get().refresh();
      return updated.item;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  deleteMemory: async (id) => {
    const targetId = typeof id === 'string' ? id.trim() : '';
    if (!targetId) return;

    set({ isLoading: true, error: null });
    try {
      await memoryOps.delete(targetId);
      await get().refresh();
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  updateSettings: async (patch) => {
    set({ isLoading: true, error: null });
    try {
      const res = await memoryOps.updateSettings({
        ...(typeof patch.injectionEnabled === 'boolean' ? { injectionEnabled: patch.injectionEnabled } : {}),
        ...(typeof patch.preferenceLearningEnabled === 'boolean'
          ? { preferenceLearningEnabled: patch.preferenceLearningEnabled }
          : {}),
        ...(typeof patch.privacyModeEnabled === 'boolean' ? { privacyModeEnabled: patch.privacyModeEnabled } : {}),
        ...(typeof patch.preferenceLearningThreshold === 'number'
          ? { preferenceLearningThreshold: patch.preferenceLearningThreshold }
          : {}),
      });
      set({ settings: res.settings, isLoading: false, hasLoaded: true, error: null });
      await get().refreshInjectionPreview();
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  clearLearnedPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      await memoryOps.clearLearnedPreferences({ scope: 'learned' });
      await get().refresh();
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },
}));

