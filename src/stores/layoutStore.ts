import { create } from 'zustand';

export type LayoutState = {
  sidebarWidthPx: number;
  aiPanelWidthPx: number;
  isSidebarCollapsed: boolean;
  isAiPanelCollapsed: boolean;
  isHydrated: boolean;

  hydrate: () => void;
  setSidebarWidthPx: (widthPx: number) => void;
  setAiPanelWidthPx: (widthPx: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAiPanelCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  toggleAiPanelCollapsed: () => void;
};

type PersistedLayoutStateV1 = {
  version: 1;
  sidebarWidthPx: number;
  aiPanelWidthPx: number;
  isSidebarCollapsed: boolean;
  isAiPanelCollapsed: boolean;
};

const LAYOUT_STORAGE_KEY = 'WN_LAYOUT_STATE_V1';

function clampPx(value: unknown, fallback: number): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.floor(raw));
}

function readPersisted(): PersistedLayoutStateV1 | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedLayoutStateV1> | null;
    if (!parsed || parsed.version !== 1) return null;

    return {
      version: 1,
      sidebarWidthPx: clampPx(parsed.sidebarWidthPx, 320),
      aiPanelWidthPx: clampPx(parsed.aiPanelWidthPx, 340),
      isSidebarCollapsed: Boolean(parsed.isSidebarCollapsed),
      isAiPanelCollapsed: Boolean(parsed.isAiPanelCollapsed),
    };
  } catch {
    return null;
  }
}

function persist(state: LayoutState) {
  const payload: PersistedLayoutStateV1 = {
    version: 1,
    sidebarWidthPx: state.sidebarWidthPx,
    aiPanelWidthPx: state.aiPanelWidthPx,
    isSidebarCollapsed: state.isSidebarCollapsed,
    isAiPanelCollapsed: state.isAiPanelCollapsed,
  };

  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (non-critical preference persistence)
  }
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  sidebarWidthPx: 320,
  aiPanelWidthPx: 340,
  isSidebarCollapsed: false,
  isAiPanelCollapsed: false,
  isHydrated: false,

  /**
   * Why: layout persistence must be explicit (one-time hydration) to keep failure modes observable and reversible.
   */
  hydrate: () => {
    const persisted = readPersisted();
    if (!persisted) {
      set({ isHydrated: true });
      return;
    }

    set({
      sidebarWidthPx: persisted.sidebarWidthPx,
      aiPanelWidthPx: persisted.aiPanelWidthPx,
      isSidebarCollapsed: persisted.isSidebarCollapsed,
      isAiPanelCollapsed: persisted.isAiPanelCollapsed,
      isHydrated: true,
    });
  },

  setSidebarWidthPx: (widthPx) => {
    const next = clampPx(widthPx, 320);
    set({ sidebarWidthPx: next });
    persist(get());
  },

  setAiPanelWidthPx: (widthPx) => {
    const next = clampPx(widthPx, 340);
    set({ aiPanelWidthPx: next });
    persist(get());
  },

  setSidebarCollapsed: (collapsed) => {
    set({ isSidebarCollapsed: collapsed });
    persist(get());
  },

  setAiPanelCollapsed: (collapsed) => {
    set({ isAiPanelCollapsed: collapsed });
    persist(get());
  },

  toggleSidebarCollapsed: () => {
    const next = !get().isSidebarCollapsed;
    set({ isSidebarCollapsed: next });
    persist(get());
  },

  toggleAiPanelCollapsed: () => {
    const next = !get().isAiPanelCollapsed;
    set({ isAiPanelCollapsed: next });
    persist(get());
  },
}));

