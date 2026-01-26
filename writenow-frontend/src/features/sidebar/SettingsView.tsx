/**
 * SettingsView - 设置视图
 * Why: 提供应用设置入口
 */

import { ChevronRight } from 'lucide-react';

interface SettingGroup {
  title: string;
  items: string[];
}

export function SettingsView() {
  const settingGroups: SettingGroup[] = [
    {
      title: 'Editor',
      items: ['Font Size', 'Theme', 'Auto Save', 'Formatting'],
    },
    {
      title: 'AI Assistant',
      items: ['Default Model', 'API Settings', 'Proxy Config'],
    },
    {
      title: 'Extensions',
      items: ['Installed', 'Updates', 'Recommended'],
    },
  ];

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">
          Settings
        </span>
      </div>

      <div className="overflow-y-auto">
        {settingGroups.map((group) => (
          <div key={group.title} className="border-b border-[var(--border-subtle)]">
            <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
              {group.title}
            </div>
            {group.items.map((item) => (
              <button
                key={item}
                className="w-full px-3 py-1.5 hover:bg-[var(--bg-hover)] flex items-center justify-between text-[13px] text-[var(--text-secondary)] transition-colors text-left"
              >
                <span>{item}</span>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export default SettingsView;
