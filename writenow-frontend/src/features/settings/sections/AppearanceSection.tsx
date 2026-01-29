/**
 * AppearanceSection - Language, theme, and editor mode settings.
 *
 * Why: Extracted from SettingsPanel for better maintainability.
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { normalizeAppLanguage, setStoredLanguage, type AppLanguage } from '@/lib/i18n/i18n';
import type { Theme } from '@/lib/theme/themeManager';
import type { EditorMode } from '@/stores';

import { SettingItem, SettingSelect, SettingSection, type SelectOption } from '../components';

export interface AppearanceSectionProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  defaultEditorMode: EditorMode;
  setDefaultEditorMode: (mode: EditorMode) => void;
}

export function AppearanceSection({
  theme,
  setTheme,
  defaultEditorMode,
  setDefaultEditorMode,
}: AppearanceSectionProps) {
  const { t, i18n } = useTranslation();

  const language = useMemo(() => normalizeAppLanguage(i18n.language), [i18n.language]);

  const handleLanguageChange = useCallback(
    async (next: AppLanguage) => {
      setStoredLanguage(next);
      await i18n.changeLanguage(next);
    },
    [i18n],
  );

  const languageOptions: SelectOption<AppLanguage>[] = useMemo(
    () => [
      { value: 'zh-CN', label: t('settings.theme.zhCN') },
      { value: 'en', label: t('settings.theme.en') },
    ],
    [t],
  );

  const themeOptions: SelectOption<Theme>[] = useMemo(
    () => [
      { value: 'system', label: t('settings.theme.system') },
      { value: 'midnight', label: t('settings.theme.midnight') },
      { value: 'dark', label: t('settings.theme.dark') },
      { value: 'light', label: t('settings.theme.light') },
      { value: 'high-contrast', label: t('settings.theme.highContrast') },
    ],
    [t],
  );

  const editorModeOptions: SelectOption<EditorMode>[] = useMemo(
    () => [
      { value: 'richtext', label: t('settings.editorMode.richtext') },
      { value: 'markdown', label: t('settings.editorMode.markdown') },
    ],
    [t],
  );

  return (
    <SettingSection title={t('settings.section.appearance')}>
      <SettingItem
        label={t('settings.label.language')}
        description={t('settings.label.languageHint')}
        data-testid="settings-language-item"
      >
        <SettingSelect
          value={language}
          options={languageOptions}
          onChange={(v) => void handleLanguageChange(v)}
          aria-label={t('settings.label.language')}
          data-testid="settings-language-select"
        />
      </SettingItem>

      <SettingItem label={t('settings.label.theme')} data-testid="settings-theme-item">
        <SettingSelect
          value={theme}
          options={themeOptions}
          onChange={setTheme}
          aria-label={t('settings.label.theme')}
          data-testid="settings-theme-select"
        />
      </SettingItem>

      <SettingItem label={t('settings.label.editorMode')} data-testid="settings-editor-mode-item">
        <SettingSelect
          value={defaultEditorMode}
          options={editorModeOptions}
          onChange={setDefaultEditorMode}
          aria-label={t('settings.label.editorMode')}
          data-testid="settings-editor-mode-select"
        />
      </SettingItem>
    </SettingSection>
  );
}
