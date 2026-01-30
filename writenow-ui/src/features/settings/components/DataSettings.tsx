/**
 * DataSettings Component
 *
 * 数据与存储设置页，包含 Auto Save、Backup 等选项。
 *
 * @see DESIGN_SPEC.md 11.2.2 Settings Schema
 */
import { useSettingsStore, useDataSettings } from '@/stores';
import { Switch, Select } from '@/components/primitives';
import { SettingsSection, SettingItem } from './SettingsSection';

/** 自动保存间隔选项 */
const AUTO_SAVE_INTERVALS = [
  { value: '1', label: '1 second' },
  { value: '3', label: '3 seconds' },
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
];

/** 备份频率选项 */
const BACKUP_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * DataSettings
 *
 * 数据与存储相关设置。
 */
export function DataSettings() {
  const data = useDataSettings();
  const updateDataSettings = useSettingsStore((s) => s.updateDataSettings);

  return (
    <div className="flex flex-col gap-8">
      {/* 自动保存 */}
      <SettingsSection
        title="Auto Save"
        description="Automatically save your work as you write."
      >
        <SettingItem
          title="Enable Auto Save"
          description="Save changes automatically while editing."
        >
          <Switch
            checked={data.autoSaveEnabled}
            onChange={(checked) => updateDataSettings({ autoSaveEnabled: checked })}
          />
        </SettingItem>

        <SettingItem
          title="Save Interval"
          description="How often to save changes (when auto save is enabled)."
        >
          <Select
            value={String(data.autoSaveInterval)}
            options={AUTO_SAVE_INTERVALS}
            onChange={(value) => updateDataSettings({ autoSaveInterval: Number(value) })}
            disabled={!data.autoSaveEnabled}
            className="w-[140px]"
          />
        </SettingItem>
      </SettingsSection>

      {/* 备份 */}
      <SettingsSection
        title="Backup"
        description="Keep backups of your projects for recovery."
      >
        <SettingItem
          title="Enable Backup"
          description="Create automatic backups of your projects."
        >
          <Switch
            checked={data.backupEnabled}
            onChange={(checked) => updateDataSettings({ backupEnabled: checked })}
          />
        </SettingItem>

        <SettingItem
          title="Backup Frequency"
          description="How often to create backups."
        >
          <Select
            value={data.backupFrequency}
            options={BACKUP_FREQUENCIES}
            onChange={(value) =>
              updateDataSettings({
                backupFrequency: value as 'daily' | 'weekly' | 'monthly',
              })
            }
            disabled={!data.backupEnabled}
            className="w-[140px]"
          />
        </SettingItem>
      </SettingsSection>
    </div>
  );
}

DataSettings.displayName = 'DataSettings';
