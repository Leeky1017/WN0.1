import { create } from 'zustand';

import { IpcError, skillOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

import type { SkillListItem, SkillReadResponse } from '../types/ipc';

type SkillDetail = SkillReadResponse['skill'];

type SkillsState = {
  items: SkillListItem[];
  isLoading: boolean;
  error: string | null;
  lastLoadedAtMs: number | null;

  refresh: (options?: { includeDisabled?: boolean }) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  read: (id: string) => Promise<SkillDetail>;
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

/**
 * Centralized Skills store for list + details.
 * Why: multiple UI entrypoints (AI panel, command palette, studio) must share a single source of truth.
 */
export const useSkillsStore = create<SkillsState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  lastLoadedAtMs: null,

  refresh: async (options) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const res = await skillOps.list(options?.includeDisabled ? { includeDisabled: true } : undefined);
      set({ items: res.skills, isLoading: false, error: null, lastLoadedAtMs: Date.now() });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
    }
  },

  toggle: async (id, enabled) => {
    const skillId = typeof id === 'string' ? id.trim() : '';
    if (!skillId) return;
    try {
      await skillOps.toggle({ id: skillId, enabled });
      set((state) => ({
        items: state.items.map((item) => (item.id === skillId ? { ...item, enabled } : item)),
      }));
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  read: async (id) => {
    const skillId = typeof id === 'string' ? id.trim() : '';
    if (!skillId) {
      throw new Error('Invalid skill id');
    }
    return skillOps.read(skillId).then((res) => res.skill);
  },
}));

