/**
 * Theme store
 * Why: Expose theme selection as app state (for settings UI + command palette) while delegating DOM work to ThemeManager.
 */

import { create } from 'zustand';

import { themeManager, type Theme } from '@/lib/theme/themeManager';

export interface ThemeState {
  theme: Theme;
  initialized: boolean;
  setTheme: (theme: Theme) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'midnight',
  initialized: false,

  setTheme: (theme) => {
    themeManager.setTheme(theme);
    set({ theme });
  },

  init: () => {
    if (get().initialized) return;
    const theme = themeManager.loadAndApply();
    set({ theme, initialized: true });
  },
}));

export default useThemeStore;
