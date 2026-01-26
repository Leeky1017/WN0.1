/**
 * SidebarPanel - 侧边栏面板容器
 * 
 * Why: 根据 ActivityBar 选中的视图切换内容
 * Uses the new design token system for consistent styling.
 */

import type { SidebarView } from './ActivityBar';
import { FilesView } from '@/features/sidebar/FilesView';
import { OutlineView } from '@/features/sidebar/OutlineView';
import { HistoryView } from '@/features/sidebar/HistoryView';
import { StatsView } from '@/features/sidebar/StatsView';
import { SettingsView } from '@/features/sidebar/SettingsView';

interface SidebarPanelProps {
  view: SidebarView;
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
  editorContent: string;
}

export function SidebarPanel({
  view,
  selectedFile,
  onSelectFile,
  editorContent,
}: SidebarPanelProps) {
  return (
    <div className="w-64 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col h-full">
      {view === 'files' && (
        <FilesView selectedFile={selectedFile} onSelectFile={onSelectFile} />
      )}
      {view === 'outline' && (
        <OutlineView editorContent={editorContent} selectedFile={selectedFile} />
      )}
      {view === 'history' && (
        <HistoryView
          // Why: Reset internal load/preview state when switching files without using setState in effects (lint rule).
          key={selectedFile ?? 'no-file'}
          selectedFile={selectedFile}
        />
      )}
      {view === 'stats' && <StatsView />}
      {view === 'settings' && <SettingsView />}
    </div>
  );
}

export default SidebarPanel;
