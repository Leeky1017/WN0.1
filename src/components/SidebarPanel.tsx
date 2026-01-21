import React from 'react';
import type { SidebarView } from '../App';
import { FilesView } from './sidebar-views/FilesView';
import { OutlineView } from './sidebar-views/OutlineView';
import { WorkflowView } from './sidebar-views/WorkflowView';
import { MaterialsView } from './sidebar-views/MaterialsView';
import { PublishView } from './sidebar-views/PublishView';
import { StatsView } from './sidebar-views/StatsView';
import { SettingsView } from './sidebar-views/SettingsView';
import { MemoryView } from './sidebar-views/MemoryView';
import { CharactersView } from './sidebar-views/CharactersView';
import { KnowledgeGraphView } from './sidebar-views/KnowledgeGraphView';
import { ProjectSidebar } from './ProjectSidebar';

interface SidebarPanelProps {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  selectedFile: string | null;
  onSelectFile: (file: string) => void | Promise<void>;
  editorContent: string;
}

function getSidebarWidth(view: SidebarView) {
  if (view === 'characters' || view === 'knowledgeGraph' || view === 'memory') return 'w-[420px]';
  return 'w-64';
}

export function SidebarPanel({ view, onViewChange, selectedFile, onSelectFile, editorContent }: SidebarPanelProps) {
  return (
    <div className={`${getSidebarWidth(view)} bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col`}>
      <ProjectSidebar activeView={view} onViewChange={onViewChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === 'files' && <FilesView selectedFile={selectedFile} onSelectFile={onSelectFile} />}
        {view === 'characters' && <CharactersView />}
        {view === 'outline' && <OutlineView editorContent={editorContent} selectedFile={selectedFile} />}
        {view === 'knowledgeGraph' && <KnowledgeGraphView />}
        {view === 'workflow' && <WorkflowView selectedFile={selectedFile} onSelectFile={onSelectFile} />}
        {view === 'materials' && <MaterialsView />}
        {view === 'publish' && <PublishView />}
        {view === 'stats' && <StatsView />}
        {view === 'memory' && <MemoryView />}
        {view === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}
