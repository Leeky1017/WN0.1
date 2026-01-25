/**
 * Layout store
 * Why: Centralize layout persistence + reset signaling for FlexLayout.
 */

import { create } from 'zustand';

import { hasStoredLayout as hasStoredLayoutInStorage, resetLayout as resetLayoutInStorage } from '@/lib/layout/persistence';

export interface LayoutState {
  /** Increment to force FlexLayout model re-hydration. */
  resetToken: number;
  /** Whether a user-custom layout exists in storage. */
  hasStoredLayout: boolean;

  refreshHasStoredLayout: () => void;
  resetLayout: () => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  resetToken: 0,
  hasStoredLayout: hasStoredLayoutInStorage(),

  refreshHasStoredLayout: () => {
    set({ hasStoredLayout: hasStoredLayoutInStorage() });
  },

  resetLayout: () => {
    resetLayoutInStorage();
    set({ resetToken: get().resetToken + 1, hasStoredLayout: false });
  },
}));
