/**
 * ActivityBar - 左侧图标导航栏组件
 * Why: 提供功能区切换入口（仅显示已实现的功能）
 */

import {
  Files,
  ListTree,
  History,
  BarChart3,
  Settings,
} from 'lucide-react';

export type SidebarView =
  | 'files'
  | 'outline'
  | 'history'
  | 'stats'
  | 'settings';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  // 仅显示已实现的功能
  // 隐藏：workflow（创作工作流）、materials（素材库）、publish（发布平台）
  const activities = [
    { id: 'files' as SidebarView, icon: Files, label: '文件浏览器' },
    { id: 'outline' as SidebarView, icon: ListTree, label: '文档大纲' },
    { id: 'history' as SidebarView, icon: History, label: '版本历史' },
    { id: 'stats' as SidebarView, icon: BarChart3, label: '创作统计' },
    { id: 'settings' as SidebarView, icon: Settings, label: '设置' },
  ];

  return (
    <div className="w-12 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col items-center py-2">
      {activities.map((activity) => {
        const Icon = activity.icon;
        const isActive = activeView === activity.id;

        return (
          <button
            key={activity.id}
            data-testid={`activity-${activity.id}`}
            onClick={() => onViewChange(activity.id)}
            className={`w-12 h-10 flex items-center justify-center relative transition-colors ${
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
            title={activity.label}
          >
            <Icon className="w-5 h-5" />
            {isActive && (
              <div className="absolute left-0 w-0.5 h-6 bg-[var(--accent-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ActivityBar;
