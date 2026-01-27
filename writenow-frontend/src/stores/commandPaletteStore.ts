/**
 * Command palette store
 * Why: Centralize cmdk open/query state + recent selections with predictable persistence.
 */

import { create } from 'zustand';

export type CommandPaletteRecentType = 'file' | 'command' | 'skill';

export type CommandPaletteRecentItem = {
  type: CommandPaletteRecentType;
  id: string;
  label: string;
  usedAt: number;
};

const RECENT_STORAGE_KEY = 'writenow_cmdk_recent_v1';
const MAX_RECENT = 12;

function safeParseRecent(raw: string | null): CommandPaletteRecentItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const rec = item as { type?: unknown; id?: unknown; label?: unknown; usedAt?: unknown };
        if (rec.type !== 'file' && rec.type !== 'command' && rec.type !== 'skill') return null;
        if (typeof rec.id !== 'string' || typeof rec.label !== 'string' || typeof rec.usedAt !== 'number') return null;
        return { type: rec.type, id: rec.id, label: rec.label, usedAt: rec.usedAt } satisfies CommandPaletteRecentItem;
      })
      .filter((x): x is CommandPaletteRecentItem => Boolean(x));
  } catch {
    return [];
  }
}

function loadRecent(): CommandPaletteRecentItem[] {
  return safeParseRecent(localStorage.getItem(RECENT_STORAGE_KEY));
}

function saveRecent(items: CommandPaletteRecentItem[]): void {
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
}

export interface CommandPaletteState {
  open: boolean;
  query: string;
  recent: CommandPaletteRecentItem[];

  setOpen: (open: boolean) => void;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (query: string) => void;
  addRecent: (item: Omit<CommandPaletteRecentItem, 'usedAt'>) => void;
  clearRecent: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  open: false,
  query: '',
  recent: typeof window === 'undefined' ? [] : loadRecent(),

  setOpen: (open) => set({ open }),
  openPalette: () => set({ open: true }),
  closePalette: () => set({ open: false, query: '' }),
  togglePalette: () => set((state) => ({ open: !state.open, query: '' })),
  setQuery: (query) => set({ query }),

  addRecent: (item) => {
    const next: CommandPaletteRecentItem = { ...item, usedAt: Date.now() };
    const prev = get().recent;
    const deduped = [next, ...prev.filter((r) => !(r.type === next.type && r.id === next.id))].slice(0, MAX_RECENT);
    set({ recent: deduped });
    saveRecent(deduped);
  },

  clearRecent: () => {
    set({ recent: [] });
    saveRecent([]);
  },
}));

export default useCommandPaletteStore;
