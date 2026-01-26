import React from 'react';
import { Files, ListTree, Workflow, Image, Share2, BarChart3, Settings } from 'lucide-react';
import type { SidebarView } from '../App';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const activities = [
    { id: 'files' as SidebarView, icon: Files, label: '文件浏览器' },
    { id: 'outline' as SidebarView, icon: ListTree, label: '文档大纲' },
    { id: 'workflow' as SidebarView, icon: Workflow, label: '创作工作流' },
    { id: 'materials' as SidebarView, icon: Image, label: '素材库' },
    { id: 'publish' as SidebarView, icon: Share2, label: '发布平台' },
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
              <div className="absolute left-0 w-0.5 h-6 bg-[var(--accent-primary)]"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
