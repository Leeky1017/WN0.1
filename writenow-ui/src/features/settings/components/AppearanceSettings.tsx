/**
 * AppearanceSettings Component
 *
 * 外观设置页，包含 Theme、Font、Scale 等选项。
 *
 * @see DESIGN_SPEC.md 11.2.2 Settings Schema
 */
import { useSettingsStore, useAppearanceSettings } from '@/stores';
import { Select } from '@/components/primitives';
import { SettingsSection, SettingItem } from './SettingsSection';

/** 主题选项 */
const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

/** UI 字体选项 */
const UI_FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'SF Pro', label: 'SF Pro' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'System', label: 'System Default' },
];

/** 编辑器字体选项 */
const EDITOR_FONT_OPTIONS = [
  { value: 'Lora', label: 'Lora (Serif)' },
  { value: 'Inter', label: 'Inter (Sans)' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono (Mono)' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Crimson Pro', label: 'Crimson Pro' },
];

/** 字号选项 */
const FONT_SIZE_OPTIONS = [
  { value: '12', label: '12px' },
  { value: '14', label: '14px' },
  { value: '16', label: '16px (Default)' },
  { value: '18', label: '18px' },
  { value: '20', label: '20px' },
  { value: '24', label: '24px' },
];

/** 行高选项 */
const LINE_HEIGHT_OPTIONS = [
  { value: '1.4', label: '1.4 (Compact)' },
  { value: '1.5', label: '1.5' },
  { value: '1.6', label: '1.6 (Default)' },
  { value: '1.8', label: '1.8 (Relaxed)' },
  { value: '2.0', label: '2.0 (Loose)' },
];

/** 界面缩放选项 */
const INTERFACE_SCALE_OPTIONS = [
  { value: '80', label: '80%' },
  { value: '90', label: '90%' },
  { value: '100', label: '100% (Default)' },
  { value: '110', label: '110%' },
  { value: '125', label: '125%' },
  { value: '150', label: '150%' },
];

/**
 * AppearanceSettings
 *
 * 外观相关设置。
 */
export function AppearanceSettings() {
  const appearance = useAppearanceSettings();
  const updateAppearanceSettings = useSettingsStore((s) => s.updateAppearanceSettings);

  return (
    <div className="flex flex-col gap-8">
      {/* 主题 */}
      <SettingsSection
        title="Theme"
        description="Choose your preferred color scheme."
      >
        <SettingItem
          title="Color Theme"
          description="Select light, dark, or match your system settings."
        >
          <Select
            value={appearance.theme}
            options={THEME_OPTIONS}
            onChange={(value) =>
              updateAppearanceSettings({
                theme: value as 'light' | 'dark' | 'system',
              })
            }
            className="w-[140px]"
          />
        </SettingItem>
      </SettingsSection>

      {/* 字体 */}
      <SettingsSection
        title="Typography"
        description="Customize fonts for the interface and editor."
      >
        <SettingItem
          title="UI Font"
          description="Font used for menus, buttons, and labels."
        >
          <Select
            value={appearance.uiFont}
            options={UI_FONT_OPTIONS}
            onChange={(value) => updateAppearanceSettings({ uiFont: value })}
            className="w-[180px]"
          />
        </SettingItem>

        <SettingItem
          title="Editor Font"
          description="Font used for writing content."
        >
          <Select
            value={appearance.editorFont}
            options={EDITOR_FONT_OPTIONS}
            onChange={(value) => updateAppearanceSettings({ editorFont: value })}
            className="w-[180px]"
          />
        </SettingItem>

        <SettingItem
          title="Font Size"
          description="Base font size for the editor."
        >
          <Select
            value={String(appearance.fontSize)}
            options={FONT_SIZE_OPTIONS}
            onChange={(value) => updateAppearanceSettings({ fontSize: Number(value) })}
            className="w-[160px]"
          />
        </SettingItem>

        <SettingItem
          title="Line Height"
          description="Spacing between lines in the editor."
        >
          <Select
            value={String(appearance.lineHeight)}
            options={LINE_HEIGHT_OPTIONS}
            onChange={(value) => updateAppearanceSettings({ lineHeight: Number(value) })}
            className="w-[160px]"
          />
        </SettingItem>
      </SettingsSection>

      {/* 界面缩放 */}
      <SettingsSection
        title="Interface"
        description="Adjust the overall interface size."
      >
        <SettingItem
          title="Interface Scale"
          description="Scale all UI elements up or down."
        >
          <Select
            value={String(appearance.interfaceScale)}
            options={INTERFACE_SCALE_OPTIONS}
            onChange={(value) =>
              updateAppearanceSettings({ interfaceScale: Number(value) })
            }
            className="w-[160px]"
          />
        </SettingItem>
      </SettingsSection>
    </div>
  );
}

AppearanceSettings.displayName = 'AppearanceSettings';
