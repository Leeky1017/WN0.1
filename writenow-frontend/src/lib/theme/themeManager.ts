/**
 * ThemeManager
 * Why: Keep theme switching deterministic and centralized (DOM attribute + persistence + system listener).
 */

export type Theme = 'midnight' | 'dark' | 'light' | 'high-contrast' | 'system';

const STORAGE_KEY = 'writenow_theme_v1';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type MediaListener = ((ev: MediaQueryListEvent) => void) | null;

class ThemeManager {
  private current: Theme = 'midnight';
  private mediaListener: MediaListener = null;

  get theme(): Theme {
    return this.current;
  }

  /**
   * Apply theme selection to the document.
   * Failure semantics: throws only if storage access fails unexpectedly.
   */
  setTheme(theme: Theme): void {
    this.current = theme;

    const resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);

    localStorage.setItem(STORAGE_KEY, theme);
    this.syncSystemListener();
  }

  /**
   * Load saved theme (or fallback to midnight) and apply immediately.
   */
  loadAndApply(): Theme {
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = this.coerceTheme(saved) ?? 'midnight';
    this.setTheme(theme);
    return theme;
  }

  private syncSystemListener(): void {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    if (this.current !== 'system') {
      if (this.mediaListener) {
        mq.removeEventListener('change', this.mediaListener);
        this.mediaListener = null;
      }
      return;
    }

    if (this.mediaListener) return;
    this.mediaListener = (e) => {
      if (this.current !== 'system') return;
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', this.mediaListener);
  }

  private coerceTheme(raw: string | null): Theme | null {
    if (!raw) return null;
    if (raw === 'midnight' || raw === 'dark' || raw === 'light' || raw === 'high-contrast' || raw === 'system') return raw;
    return null;
  }
}

export const themeManager = new ThemeManager();
