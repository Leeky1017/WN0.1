import React from 'react';
import type { SidebarView } from '../App';
import { FilesView } from './sidebar-views/FilesView';
import { OutlineView } from './sidebar-views/OutlineView';
import { WorkflowView } from './sidebar-views/WorkflowView';
import { MaterialsView } from './sidebar-views/MaterialsView';
import { PublishView } from './sidebar-views/PublishView';
import { StatsView } from './sidebar-views/StatsView';
import { SettingsView } from './sidebar-views/SettingsView';

interface SidebarPanelProps {
  view: SidebarView;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  editorContent: string;
}

export function SidebarPanel({ view, selectedFile, onSelectFile, editorContent }: SidebarPanelProps) {
  return (
    <div className="w-64 bg-[var(--bg-primary)] border-r border-[var(--border-default)] flex flex-col">
      {view === 'files' && <FilesView selectedFile={selectedFile} onSelectFile={onSelectFile} />}
      {view === 'outline' && <OutlineView editorContent={editorContent} selectedFile={selectedFile} />}
      {view === 'workflow' && <WorkflowView selectedFile={selectedFile} onSelectFile={onSelectFile} />}
      {view === 'materials' && <MaterialsView />}
      {view === 'publish' && <PublishView />}
      {view === 'stats' && <StatsView />}
      {view === 'settings' && <SettingsView />}
    </div>
  );
}
