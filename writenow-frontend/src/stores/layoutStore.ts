/**
 * Layout store (simplified)
 * Why: Centralize layout state for panel visibility and sidebar collapse.
 */

import { create } from 'zustand';

const LAYOUT_STORAGE_KEY = 'writenow_layout_v1';

export interface LayoutState {
  /** Left sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Right panel (AI) collapsed state */
  rightPanelCollapsed: boolean;
  /** Active sidebar view */
  activeSidebarView: string;

  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setActiveSidebarView: (view: string) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  resetLayout: () => void;
}

function loadLayoutState(): Partial<LayoutState> {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<LayoutState>;
  } catch {
    return {};
  }
}

function saveLayoutState(state: Partial<LayoutState>): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const initialState = loadLayoutState();

export const useLayoutStore = create<LayoutState>((set, get) => ({
  sidebarCollapsed: initialState.sidebarCollapsed ?? false,
  rightPanelCollapsed: initialState.rightPanelCollapsed ?? false,
  activeSidebarView: initialState.activeSidebarView ?? 'files',

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    saveLayoutState({ ...get(), sidebarCollapsed: collapsed });
  },

  setRightPanelCollapsed: (collapsed) => {
    set({ rightPanelCollapsed: collapsed });
    saveLayoutState({ ...get(), rightPanelCollapsed: collapsed });
  },

  setActiveSidebarView: (view) => {
    set({ activeSidebarView: view });
    saveLayoutState({ ...get(), activeSidebarView: view });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    saveLayoutState({ ...get(), sidebarCollapsed: next });
  },

  toggleRightPanel: () => {
    const next = !get().rightPanelCollapsed;
    set({ rightPanelCollapsed: next });
    saveLayoutState({ ...get(), rightPanelCollapsed: next });
  },

  resetLayout: () => {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    set({
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
      activeSidebarView: 'files',
    });
  },
}));
