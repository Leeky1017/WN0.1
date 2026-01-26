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
    <div data-testid="settings-view" className="h-full flex flex-col">
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          Settings
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar" data-testid="settings-list">
        {settingGroups.map((group) => (
          <div key={group.title} className="border-b border-[var(--border-subtle)]" data-testid={`settings-group-${group.title.toLowerCase()}`}>
            <div className="px-3 py-2 text-[10px] text-[var(--fg-subtle)] uppercase tracking-wider font-semibold">
              {group.title}
            </div>
            {group.items.map((item) => (
              <button
                key={item}
                data-testid={`settings-item-${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="w-full px-3 py-1.5 hover:bg-[var(--bg-hover)] flex items-center justify-between text-[13px] text-[var(--fg-muted)] transition-colors duration-[100ms] text-left"
              >
                <span>{item}</span>
                <ChevronRight className="w-4 h-4 text-[var(--fg-subtle)]" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SettingsView;
