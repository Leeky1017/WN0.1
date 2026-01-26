import React, { useState, useEffect } from 'react';
import { ActivityBar } from './components/ActivityBar';
import { SidebarPanel } from './components/SidebarPanel';
import { Editor } from './components/Editor';
import { AIPanel } from './components/AIPanel';
import { StatsBar } from './components/StatsBar';

export type EditorMode = 'markdown' | 'word';
export type ViewMode = 'edit' | 'preview' | 'split';
export type SidebarView = 'files' | 'outline' | 'workflow' | 'materials' | 'publish' | 'stats' | 'settings';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>('欢迎使用.md');
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [statsBarOpen, setStatsBarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [focusMode, setFocusMode] = useState(false);
  const [editorContent, setEditorContent] = useState('');

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

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Menu Bar */}
      {!focusMode && (
        <div className="h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center px-2 text-[13px]">
          <div className="flex gap-4 px-2">
            <span className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">File</span>
            <span className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">Edit</span>
            <span className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">View</span>
            <span className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">Publish</span>
          </div>
          <div className="flex-1 text-center text-[var(--text-tertiary)] text-[11px]">WriteNow</div>
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setStatsBarOpen(!statsBarOpen)}
              className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] transition-colors"
            >
              {statsBarOpen ? 'Hide Stats' : 'Show Stats'}
            </button>
            <button 
              onClick={() => setFocusMode(!focusMode)}
              className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] transition-colors"
            >
              Focus
            </button>
            <button 
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] transition-colors"
            >
              AI
            </button>
          </div>
        </div>
      )}

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
              onSelectFile={setSelectedFile}
              editorContent={editorContent}
            />
          </>
        )}
        
        <Editor 
          selectedFile={selectedFile}
          editorMode={editorMode}
          viewMode={viewMode}
          onEditorModeChange={setEditorMode}
          onViewModeChange={setViewMode}
          focusMode={focusMode}
          onFocusModeToggle={() => setFocusMode(!focusMode)}
          onContentChange={setEditorContent}
        />
        
        {!focusMode && aiPanelOpen && <AIPanel />}
      </div>

      {/* Focus Mode Exit Hint */}
      {focusMode && (
        <div className="fixed top-4 right-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded px-3 py-2 flex items-center gap-2 shadow-lg animate-fade-in">
          <span className="text-[11px] text-[var(--text-tertiary)]">按 ESC 退出专注模式</span>
          <button
            onClick={() => setFocusMode(false)}
            className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
          >
            退出
          </button>
        </div>
      )}
    </div>
  );
}
