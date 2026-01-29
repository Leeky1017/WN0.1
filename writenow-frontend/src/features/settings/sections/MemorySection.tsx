/**
 * MemorySection - Memory injection and preference learning settings.
 *
 * Why: Extracted from SettingsPanel for better maintainability.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { MemorySettings } from '@/types/ipc-generated';

import { SettingError, SettingInput, SettingItem, SettingSection, SettingSwitch } from '../components';

export interface MemorySectionProps {
  settings: MemorySettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (partial: Partial<MemorySettings>) => Promise<void>;
}

export function MemorySection({ settings, loading, error, updateSettings }: MemorySectionProps) {
  const { t } = useTranslation();

  const applyThreshold = useCallback(
    async (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      await updateSettings({ preferenceLearningThreshold: value });
    },
    [updateSettings],
  );

  const disabled = !settings || loading;

  return (
    <SettingSection title={t('settings.section.memory')}>
      {loading && (
        <div className="text-[11px] text-[var(--fg-muted)]">{t('settings.memory.loading')}</div>
      )}

      <SettingSwitch
        label={t('settings.memory.injection')}
        description={t('settings.memory.injectionDesc')}
        checked={Boolean(settings?.injectionEnabled)}
        onCheckedChange={(checked) => void updateSettings({ injectionEnabled: checked })}
        disabled={disabled}
        data-testid="settings-memory-injection"
      />

      <SettingSwitch
        label={t('settings.memory.preferenceLearning')}
        description={t('settings.memory.preferenceLearningDesc')}
        checked={Boolean(settings?.preferenceLearningEnabled)}
        onCheckedChange={(checked) => void updateSettings({ preferenceLearningEnabled: checked })}
        disabled={disabled}
        data-testid="settings-memory-preference-learning"
      />

      <SettingSwitch
        label={t('settings.memory.privacyMode')}
        description={t('settings.memory.privacyModeDesc')}
        checked={Boolean(settings?.privacyModeEnabled)}
        onCheckedChange={(checked) => void updateSettings({ privacyModeEnabled: checked })}
        disabled={disabled}
        data-testid="settings-memory-privacy-mode"
      />

      <SettingItem
        label={t('settings.memory.threshold')}
        description={t('settings.memory.thresholdDesc')}
        disabled={disabled || !settings?.preferenceLearningEnabled}
      >
        <SettingInput
          type="number"
          min={0}
          step={0.05}
          key={`preferenceLearningThreshold:${settings?.preferenceLearningThreshold ?? ''}`}
          defaultValue={settings ? String(settings.preferenceLearningThreshold) : ''}
          onBlur={(e) => void applyThreshold(e.currentTarget.value)}
          disabled={disabled || !settings?.preferenceLearningEnabled}
          data-testid="settings-memory-threshold-input"
        />
      </SettingItem>

      <SettingError message={error} />
    </SettingSection>
  );
}
