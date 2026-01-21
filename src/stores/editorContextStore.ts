import { create } from 'zustand';

import type { EditorContext } from '../types/context';
import type { DetectedEntityHit } from '../lib/context/entity-detect';

export type { DetectedEntityHit, DetectedEntityKind, EditorContextSource } from '../lib/context/entity-detect';

type EditorContextConfig = {
  debounceMs: number;
  windowParagraphs: number;
};

export type SettingsPrefetchState = {
  status: 'idle' | 'prefetching' | 'ready' | 'error';
  entities: string[];
  resolved: { characters: string[]; settings: string[] };
  atMs: number | null;
  errorMessage: string | null;
};

const EMPTY_PREFETCH_STATE: SettingsPrefetchState = {
  status: 'idle',
  entities: [],
  resolved: { characters: [], settings: [] },
  atMs: null,
  errorMessage: null,
};

type EditorContextState = {
  config: EditorContextConfig;
  context: EditorContext | null;
  entityHits: DetectedEntityHit[];
  syncError: string | null;
  settingsPrefetch: SettingsPrefetchState;
  lastSyncedAtMs: number | null;

  setConfig: (next: Partial<EditorContextConfig>) => void;
  setContext: (next: EditorContext) => void;
  setEntityHits: (hits: DetectedEntityHit[]) => void;
  setSyncError: (message: string | null) => void;
  setSettingsPrefetch: (next: SettingsPrefetchState) => void;
  clear: () => void;
};

function clampNonNegativeInt(value: unknown, fallback: number): number {
  const raw = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.floor(raw));
}

function clampPositiveInt(value: unknown, fallback: number): number {
  const raw = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.floor(raw));
}

function listEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * EditorContextStore is the Immediate-layer SSOT derived from the editor state.
 *
 * Why:
 * - Context assembly should not read UI/editor internals directly.
 * - Immediate context needs to be debounced for performance, but still updated fast enough for UX.
 * - Entity detection and prefetch use the same SSOT to avoid duplicated parsing paths.
 */
export const useEditorContextStore = create<EditorContextState>((set, get) => ({
  config: { debounceMs: 200, windowParagraphs: 2 },
  context: null,
  entityHits: [],
  syncError: null,
  settingsPrefetch: EMPTY_PREFETCH_STATE,
  lastSyncedAtMs: null,

  setConfig: (next) => {
    set((state) => ({
      config: {
        debounceMs: clampNonNegativeInt(next.debounceMs, state.config.debounceMs),
        windowParagraphs: clampPositiveInt(next.windowParagraphs, state.config.windowParagraphs),
      },
    }));
  },

  setContext: (next) => {
    const current = get().context;
    const shouldResetDerived =
      !current ||
      current.selectedText !== next.selectedText ||
      current.currentParagraph !== next.currentParagraph ||
      !listEqual(current.surroundingParagraphs.before, next.surroundingParagraphs.before) ||
      !listEqual(current.surroundingParagraphs.after, next.surroundingParagraphs.after);

    const detectedEntities = shouldResetDerived ? [] : current.detectedEntities ?? [];
    set({
      context: { ...next, detectedEntities },
      ...(shouldResetDerived ? { entityHits: [], settingsPrefetch: EMPTY_PREFETCH_STATE } : {}),
      syncError: null,
      lastSyncedAtMs: Date.now(),
    });
  },

  setEntityHits: (hits) => {
    const list = Array.isArray(hits) ? hits : [];
    const stableEntities = Array.from(new Set(list.map((h) => h.entity).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const ctx = get().context;
    set({
      entityHits: list,
      context: ctx ? { ...ctx, detectedEntities: stableEntities } : ctx,
    });
  },

  setSyncError: (message) => {
    const next = typeof message === 'string' ? message : null;
    set({ syncError: next });
  },

  setSettingsPrefetch: (next) => {
    set({ settingsPrefetch: next });
  },

  clear: () =>
    set({
      context: null,
      entityHits: [],
      syncError: null,
      settingsPrefetch: EMPTY_PREFETCH_STATE,
      lastSyncedAtMs: null,
    }),
}));
