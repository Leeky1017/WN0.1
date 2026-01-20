import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import zhCN from '../locales/zh-CN.json';

export type SupportedLanguage = 'zh-CN' | 'en';

const STORAGE_KEY = 'wn.language';

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'zh-CN' || value === 'en';
}

function readStoredLanguage(): SupportedLanguage | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isSupportedLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

function persistLanguage(language: string) {
  try {
    if (isSupportedLanguage(language)) {
      localStorage.setItem(STORAGE_KEY, language);
    }
  } catch {
    // ignore
  }
}

const initialLanguage: SupportedLanguage = readStoredLanguage() ?? 'zh-CN';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', persistLanguage);

export { i18n };

