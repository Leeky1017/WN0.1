/**
 * Settings panel UI store
 * Why: Provide a single, testable control point for opening/closing the Settings dialog (cmdk + hotkeys).
 */

import { create } from 'zustand';

export interface SettingsPanelState {
  open: boolean;
  setOpen: (open: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useSettingsPanelStore = create<SettingsPanelState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
}));

export default useSettingsPanelStore;
