import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { SidebarPanel } from './components/SidebarPanel';
import { Editor } from './components/Editor';
import { AIPanel } from './components/AIPanel';
import { StatsBar } from './components/StatsBar';

import { useFilesStore } from './stores/filesStore';
import { useEditorStore } from './stores/editorStore';

export type EditorMode = 'markdown' | 'word';
export type ViewMode = 'edit' | 'preview' | 'split';
export type SidebarView = 'files' | 'outline' | 'workflow' | 'materials' | 'publish' | 'stats' | 'settings';

export default function App() {
  const { t } = useTranslation();
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [statsBarOpen, setStatsBarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [focusMode, setFocusMode] = useState(false);
  const bootstrappedRef = useRef(false);

  const files = useFilesStore((s) => s.files);
  const filesHasLoaded = useFilesStore((s) => s.hasLoaded);
  const filesLoading = useFilesStore((s) => s.isLoading);
  const filesError = useFilesStore((s) => s.error);
  const refreshFiles = useFilesStore((s) => s.refresh);
  const createFile = useFilesStore((s) => s.createFile);

  const selectedFile = useEditorStore((s) => s.currentPath);
  const openFile = useEditorStore((s) => s.openFile);
  const editorContent = useEditorStore((s) => s.content);

  // ESC to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  useEffect(() => {
    refreshFiles().catch(() => undefined);
  }, [refreshFiles]);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!filesHasLoaded || filesLoading) return;
    if (filesError) return;

    bootstrappedRef.current = true;

    if (selectedFile) return;
    if (files.length > 0) {
      openFile(files[0].path).catch(() => undefined);
      return;
    }

    createFile('欢迎使用').then((created) => {
      if (created) openFile(created.path).catch(() => undefined);
    }).catch(() => undefined);
  }, [createFile, files, filesError, filesHasLoaded, filesLoading, openFile, selectedFile]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <TitleBar
        focusMode={focusMode}
        aiPanelOpen={aiPanelOpen}
        statsBarOpen={statsBarOpen}
        onToggleAIPanel={() => setAiPanelOpen(!aiPanelOpen)}
        onToggleStatsBar={() => setStatsBarOpen(!statsBarOpen)}
        onToggleFocusMode={() => setFocusMode(!focusMode)}
      />

      {/* Stats Bar */}
      {!focusMode && statsBarOpen && <StatsBar onOpenStats={() => setSidebarView('stats')} />}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {!focusMode && (
          <>
            <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />
            <SidebarPanel 
              view={sidebarView} 
              selectedFile={selectedFile} 
              onSelectFile={openFile}
              editorContent={editorContent}
            />
          </>
        )}
        
        <Editor 
          editorMode={editorMode}
          viewMode={viewMode}
          onEditorModeChange={setEditorMode}
          onViewModeChange={setViewMode}
          focusMode={focusMode}
          onFocusModeToggle={() => setFocusMode(!focusMode)}
        />
        
        {!focusMode && aiPanelOpen && <AIPanel />}
      </div>

      {/* Focus Mode Exit Hint */}
      {focusMode && (
        <div className="fixed top-4 right-4 wn-elevated rounded-md px-3 py-2 flex items-center gap-2 animate-fade-in">
          <span className="text-[11px] text-[var(--text-tertiary)]">{t('app.focus.exitHint')}</span>
          <button
            onClick={() => setFocusMode(false)}
            className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
          >
            {t('app.focus.exit')}
          </button>
        </div>
      )}
    </div>
  );
}
