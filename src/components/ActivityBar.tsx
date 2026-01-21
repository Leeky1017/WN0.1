import React from 'react';
import { Files, Kanban, Search, Users, ListTree, Network, Workflow, Image, Share2, BarChart3, Brain, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SidebarView } from '../App';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const { t } = useTranslation();
  const activities = [
    { id: 'search' as SidebarView, icon: Search, label: t('nav.search') },
    { id: 'cards' as SidebarView, icon: Kanban, label: t('nav.cards') },
    { id: 'files' as SidebarView, icon: Files, label: t('nav.files') },
    { id: 'characters' as SidebarView, icon: Users, label: t('nav.characters') },
    { id: 'outline' as SidebarView, icon: ListTree, label: t('nav.outline') },
    { id: 'knowledgeGraph' as SidebarView, icon: Network, label: t('nav.knowledgeGraph') },
    { id: 'workflow' as SidebarView, icon: Workflow, label: t('nav.workflow') },
    { id: 'materials' as SidebarView, icon: Image, label: t('nav.materials') },
    { id: 'publish' as SidebarView, icon: Share2, label: t('nav.publish') },
    { id: 'stats' as SidebarView, icon: BarChart3, label: t('nav.stats') },
    { id: 'memory' as SidebarView, icon: Brain, label: t('nav.memory') },
    { id: 'settings' as SidebarView, icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div
      className="w-12 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col items-center py-2 px-1"
      data-zen-chrome
    >
      {activities.map((activity) => {
        const Icon = activity.icon;
        const isActive = activeView === activity.id;
        
        return (
          <button
            key={activity.id}
            onClick={() => onViewChange(activity.id)}
            className={`w-10 h-9 flex items-center justify-center relative rounded-md transition-colors ${
              isActive 
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' 
                : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
            }`}
            title={activity.label}
          >
            <Icon className="w-4 h-4" />
            {isActive && (
              <div className="absolute left-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
