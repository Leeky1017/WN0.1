/**
 * i18n bootstrap (i18next + react-i18next)
 * Why: Provide a single, typed entry point for language resources + persistence.
 *
 * Notes:
 * - We default to zh-CN to keep existing UX and E2E expectations stable.
 * - Users can override via Settings; the choice persists in localStorage.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = 'writenow_language_v1';

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'zh-CN' || value === 'en';
}

/**
 * Normalize any language-like value into a supported language.
 * Why: i18next may report "en-US" / "zh" depending on environment.
 */
export function normalizeAppLanguage(value: unknown): AppLanguage {
  if (isAppLanguage(value)) return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower.startsWith('en')) return 'en';
    if (lower.startsWith('zh')) return 'zh-CN';
  }
  return 'zh-CN';
}

export function getStoredLanguage(): AppLanguage | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore (non-critical preference)
  }
}

function getInitialLanguage(): AppLanguage {
  return getStoredLanguage() ?? 'zh-CN';
}

let initPromise: Promise<void> | null = null;

/**
 * Initialize i18n once.
 * Why: Avoid duplicated init in React StrictMode.
 */
export async function initI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = i18n
    .use(initReactI18next)
    .init({
      resources: {
        'zh-CN': { translation: zhCN },
        en: { translation: en },
      },
      lng: getInitialLanguage(),
      fallbackLng: 'zh-CN',
      interpolation: { escapeValue: false },
      // Keep key paths as-is (we use nested JSON keys)
      keySeparator: '.',
    })
    .then(() => undefined);

  return initPromise;
}

export { i18n };

