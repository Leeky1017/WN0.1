/**
 * Layout store (simplified)
 * Why: Centralize layout state (panels + Focus/Zen) to avoid conflicting UI state machines.
 */

import { create } from 'zustand';

const LAYOUT_STORAGE_KEY = 'writenow_layout_v1';

export type SidebarView = 'files' | 'search' | 'outline' | 'history' | 'settings';

type PersistedLayoutState = {
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  activeSidebarView: SidebarView;
  focusMode: boolean;
};

export interface LayoutState {
  /** Left sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Right panel (AI) collapsed state */
  rightPanelCollapsed: boolean;
  /** Active sidebar view */
  activeSidebarView: SidebarView;
  /** Focus/Zen mode (write-first UI folding) */
  focusMode: boolean;

  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setActiveSidebarView: (view: SidebarView) => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  /** Explicit exit for Esc priority handling. */
  exitFocusMode: () => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  resetLayout: () => void;
}

function isSidebarView(value: unknown): value is SidebarView {
  return (
    value === 'files' ||
    value === 'search' ||
    value === 'outline' ||
    value === 'history' ||
    value === 'settings'
  );
}

function loadLayoutState(): Partial<PersistedLayoutState> {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;

    const next: Partial<PersistedLayoutState> = {};
    if (typeof record.sidebarCollapsed === 'boolean') next.sidebarCollapsed = record.sidebarCollapsed;
    if (typeof record.rightPanelCollapsed === 'boolean') next.rightPanelCollapsed = record.rightPanelCollapsed;
    if (typeof record.focusMode === 'boolean') next.focusMode = record.focusMode;
    if (isSidebarView(record.activeSidebarView)) next.activeSidebarView = record.activeSidebarView;
    return next;
  } catch {
    return {};
  }
}

function saveLayoutState(state: PersistedLayoutState): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const initialState = loadLayoutState();

export const useLayoutStore = create<LayoutState>((set, get) => {
  const persist = (patch: Partial<PersistedLayoutState>) => {
    const current = get();
    saveLayoutState({
      sidebarCollapsed: patch.sidebarCollapsed ?? current.sidebarCollapsed,
      rightPanelCollapsed: patch.rightPanelCollapsed ?? current.rightPanelCollapsed,
      activeSidebarView: patch.activeSidebarView ?? current.activeSidebarView,
      focusMode: patch.focusMode ?? current.focusMode,
    });
  };

  return {
    sidebarCollapsed: initialState.sidebarCollapsed ?? false,
    rightPanelCollapsed: initialState.rightPanelCollapsed ?? false,
    activeSidebarView: initialState.activeSidebarView ?? 'files',
    focusMode: initialState.focusMode ?? false,

    setSidebarCollapsed: (collapsed) => {
      set({ sidebarCollapsed: collapsed });
      persist({ sidebarCollapsed: collapsed });
    },

    setRightPanelCollapsed: (collapsed) => {
      set({ rightPanelCollapsed: collapsed });
      persist({ rightPanelCollapsed: collapsed });
    },

    setActiveSidebarView: (view) => {
      set({ activeSidebarView: view });
      persist({ activeSidebarView: view });
    },

    setFocusMode: (enabled) => {
      set({ focusMode: enabled });
      persist({ focusMode: enabled });
    },

    toggleFocusMode: () => {
      const next = !get().focusMode;
      set({ focusMode: next });
      persist({ focusMode: next });
    },

    exitFocusMode: () => {
      if (!get().focusMode) return;
      set({ focusMode: false });
      persist({ focusMode: false });
    },

    toggleSidebar: () => {
      const next = !get().sidebarCollapsed;
      set({ sidebarCollapsed: next });
      persist({ sidebarCollapsed: next });
    },

    toggleRightPanel: () => {
      const next = !get().rightPanelCollapsed;
      set({ rightPanelCollapsed: next });
      persist({ rightPanelCollapsed: next });
    },

    resetLayout: () => {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
      set({
        sidebarCollapsed: false,
        rightPanelCollapsed: false,
        activeSidebarView: 'files',
        focusMode: false,
      });
    },
  };
});
