import { create } from 'zustand';

export type FlowPreferences = {
  typewriterEnabled: boolean;
  typewriterTolerancePx: number;
  paragraphFocusEnabled: boolean;
  paragraphFocusDimOpacity: number;
  zenEnabled: boolean;
};

export type PreferencesState = {
  flow: FlowPreferences;
  isHydrated: boolean;

  /**
   * Why: keep preference hydration explicit so failure modes stay observable and reversible.
   */
  hydrate: () => void;

  setTypewriterEnabled: (enabled: boolean) => void;
  setTypewriterTolerancePx: (tolerancePx: number) => void;
  toggleTypewriter: () => void;

  setParagraphFocusEnabled: (enabled: boolean) => void;
  setParagraphFocusDimOpacity: (opacity: number) => void;
  toggleParagraphFocus: () => void;

  setZenEnabled: (enabled: boolean) => void;
  toggleZen: () => void;
};

type PersistedPreferencesV1 = {
  version: 1;
  flow: FlowPreferences;
};

const PREFERENCES_STORAGE_KEY = 'WN_PREFERENCES_V1';

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

function clampFloat(value: unknown, fallback: number, min: number, max: number): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

function defaultFlow(): FlowPreferences {
  return {
    typewriterEnabled: false,
    typewriterTolerancePx: 72,
    paragraphFocusEnabled: false,
    paragraphFocusDimOpacity: 0.35,
    zenEnabled: false,
  };
}

function readPersisted(): PersistedPreferencesV1 | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedPreferencesV1> | null;
    if (!parsed || parsed.version !== 1) return null;

    const flow = parsed.flow as Partial<FlowPreferences> | undefined;
    return {
      version: 1,
      flow: {
        typewriterEnabled: Boolean(flow?.typewriterEnabled),
        typewriterTolerancePx: clampInt(flow?.typewriterTolerancePx, 72, 0, 240),
        paragraphFocusEnabled: Boolean(flow?.paragraphFocusEnabled),
        paragraphFocusDimOpacity: clampFloat(flow?.paragraphFocusDimOpacity, 0.35, 0.05, 0.9),
        zenEnabled: Boolean(flow?.zenEnabled),
      },
    };
  } catch {
    return null;
  }
}

function persist(state: PreferencesState) {
  const payload: PersistedPreferencesV1 = {
    version: 1,
    flow: state.flow,
  };

  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (non-critical preference persistence)
  }
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  flow: defaultFlow(),
  isHydrated: false,

  hydrate: () => {
    const persisted = readPersisted();
    if (!persisted) {
      set({ isHydrated: true });
      return;
    }

    set({
      flow: persisted.flow,
      isHydrated: true,
    });
  },

  setTypewriterEnabled: (enabled) => {
    set((state) => ({ flow: { ...state.flow, typewriterEnabled: Boolean(enabled) } }));
    persist(get());
  },

  setTypewriterTolerancePx: (tolerancePx) => {
    const next = clampInt(tolerancePx, 72, 0, 240);
    set((state) => ({ flow: { ...state.flow, typewriterTolerancePx: next } }));
    persist(get());
  },

  toggleTypewriter: () => {
    const next = !get().flow.typewriterEnabled;
    set((state) => ({ flow: { ...state.flow, typewriterEnabled: next } }));
    persist(get());
  },

  setParagraphFocusEnabled: (enabled) => {
    set((state) => ({ flow: { ...state.flow, paragraphFocusEnabled: Boolean(enabled) } }));
    persist(get());
  },

  setParagraphFocusDimOpacity: (opacity) => {
    const next = clampFloat(opacity, 0.35, 0.05, 0.9);
    set((state) => ({ flow: { ...state.flow, paragraphFocusDimOpacity: next } }));
    persist(get());
  },

  toggleParagraphFocus: () => {
    const next = !get().flow.paragraphFocusEnabled;
    set((state) => ({ flow: { ...state.flow, paragraphFocusEnabled: next } }));
    persist(get());
  },

  setZenEnabled: (enabled) => {
    set((state) => ({ flow: { ...state.flow, zenEnabled: Boolean(enabled) } }));
    persist(get());
  },

  toggleZen: () => {
    const next = !get().flow.zenEnabled;
    set((state) => ({ flow: { ...state.flow, zenEnabled: next } }));
    persist(get());
  },
}));

