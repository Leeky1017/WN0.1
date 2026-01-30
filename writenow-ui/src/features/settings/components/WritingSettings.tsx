/**
 * WritingSettings Component
 *
 * 写作体验设置页，包含 Focus Mode、Typewriter Scroll、Smart Punctuation 等选项。
 *
 * @see DESIGN_SPEC.md 11.2.2 Settings Schema
 */
import { useSettingsStore, useWritingSettings } from '@/stores';
import { Switch } from '@/components/primitives';
import { SettingsSection, SettingItem } from './SettingsSection';

/**
 * WritingSettings
 *
 * 写作体验相关设置，所有选项均为开关类型。
 */
export function WritingSettings() {
  const writing = useWritingSettings();
  const updateWritingSettings = useSettingsStore((s) => s.updateWritingSettings);

  return (
    <div className="flex flex-col gap-8">
      {/* 写作体验 */}
      <SettingsSection
        title="Writing Experience"
        description="Customize your writing environment for maximum focus and comfort."
      >
        <SettingItem
          title="Focus Mode"
          description="Hide sidebars and toolbars for distraction-free writing."
        >
          <Switch
            checked={writing.focusMode}
            onChange={(checked) => updateWritingSettings({ focusMode: checked })}
          />
        </SettingItem>

        <SettingItem
          title="Typewriter Scroll"
          description="Keep the cursor centered on screen as you type."
        >
          <Switch
            checked={writing.typewriterScroll}
            onChange={(checked) => updateWritingSettings({ typewriterScroll: checked })}
          />
        </SettingItem>
      </SettingsSection>

      {/* 输入辅助 */}
      <SettingsSection
        title="Input Assistance"
        description="Smart features to help you write faster."
      >
        <SettingItem
          title="Smart Punctuation"
          description="Automatically convert straight quotes to curly quotes and dashes."
        >
          <Switch
            checked={writing.smartPunctuation}
            onChange={(checked) => updateWritingSettings({ smartPunctuation: checked })}
          />
        </SettingItem>

        <SettingItem
          title="Auto Pair Brackets"
          description="Automatically close brackets, parentheses, and quotes."
        >
          <Switch
            checked={writing.autoPairBrackets}
            onChange={(checked) => updateWritingSettings({ autoPairBrackets: checked })}
          />
        </SettingItem>
      </SettingsSection>
    </div>
  );
}

WritingSettings.displayName = 'WritingSettings';
