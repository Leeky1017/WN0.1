import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ActivityBar, type SidebarTab } from './activity-bar';
import { SidebarPanel } from './sidebar-panel';
import { Header } from './header';
import { Footer } from './footer';
import { SearchField } from '@/components/composed/search-field';

import { AIPanel } from '@/features/ai-panel/AIPanel';
import { CommandPalette } from '@/features/command-palette';
import { WriteModeEditorPanel } from '@/features/write-mode/WriteModeEditorPanel';
import { WriteModeFileTree } from '@/features/write-mode/WriteModeFileTree';
import { useWriteModeStore } from '@/features/write-mode/writeModeStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useStatusBarStore } from '@/stores/statusBarStore';

/**
 * AppShell - The main application layout container.
 * 
 * Performance optimizations:
 * - useCallback for event handlers to prevent child re-renders
 * - useMemo for derived values
 * - CSS transitions with will-change for GPU acceleration
 * - React.memo on child components (FileItem, MessageBubble)
 */
export function AppShell() {
  const [searchQuery, setSearchQuery] = useState('');

  const togglePalette = useCommandPaletteStore((s) => s.togglePalette);

  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const focusMode = useLayoutStore((s) => s.focusMode);
  const activeSidebarTab = useLayoutStore((s) => s.activeSidebarView);
  const setActiveSidebarView = useLayoutStore((s) => s.setActiveSidebarView);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const toggleFocusMode = useLayoutStore((s) => s.toggleFocusMode);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toggleRightPanel = useLayoutStore((s) => s.toggleRightPanel);

  const isSidebarOpen = !sidebarCollapsed && !focusMode;
  const isAiPanelOpen = !rightPanelCollapsed && !focusMode;

  const activeFilePath = useWriteModeStore((s) => s.activeFilePath);
  const saveNow = useWriteModeStore((s) => s.saveNow);

  const saveStatus = useStatusBarStore((s) => s.saveStatus);
  const saveError = useStatusBarStore((s) => s.saveError);
  const aiStatus = useStatusBarStore((s) => s.aiStatus);
  const wordCount = useStatusBarStore((s) => s.wordCount);
  const isConnected = useStatusBarStore((s) => s.isConnected);
  const cursorPosition = useStatusBarStore((s) => s.cursorPosition);
  const documentType = useStatusBarStore((s) => s.documentType);

  const fileName = useMemo(() => {
    if (!activeFilePath) return 'Untitled';
    const parts = activeFilePath.split('/');
    return parts[parts.length - 1] ?? activeFilePath;
  }, [activeFilePath]);

  /**
   * Handle tab change with smart toggle behavior.
   * Clicking active tab collapses sidebar, clicking other tab opens it.
   */
  const handleTabChange = useCallback((tab: SidebarTab) => {
    if (tab === activeSidebarTab) {
      toggleSidebar();
      return;
    }
    setActiveSidebarView(tab);
    setSidebarCollapsed(false);
  }, [activeSidebarTab, setActiveSidebarView, setSidebarCollapsed, toggleSidebar]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleToggleAiPanel = useCallback(() => {
    toggleRightPanel();
  }, [toggleRightPanel]);

  /** Map sidebar tab to display title */
  const sidebarTitle = useMemo(() => {
    const titles: Record<SidebarTab, string> = {
      files: 'Explorer',
      search: 'Search',
      outline: 'Outline',
      history: 'History',
      settings: 'Settings',
    };
    return titles[activeSidebarTab];
  }, [activeSidebarTab]);

  const handleRetrySave = useCallback(() => {
    void saveNow('retry').catch(() => {
      // Why: save errors are surfaced via unified indicators; retry is best-effort.
    });
  }, [saveNow]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCmdk = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k';
      if (isCmdk) {
        event.preventDefault();
        togglePalette();
        return;
      }

      const isFocusToggle =
        (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.code === 'Backslash' || event.key === '\\');
      if (isFocusToggle) {
        event.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleFocusMode, togglePalette]);

  return (
    <div
      data-testid="wm-focus-root"
      data-focus-mode={focusMode ? '1' : '0'}
      className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--fg-default)] font-sans"
    >
      {/* 1. Header: The Command Center */}
      <div className={focusMode ? 'hidden' : undefined}>
        <Header
          fileName={fileName}
          saveStatus={saveStatus}
          saveErrorMessage={saveError?.message ?? undefined}
          onRetrySave={handleRetrySave}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          isAiPanelOpen={isAiPanelOpen}
          onToggleAiPanel={handleToggleAiPanel}
        />
      </div>

      {/* 2. Main Workbench */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Navigation Stack */}
        <div
          className="flex h-full shrink-0 overflow-hidden"
          data-testid="layout-sidebar"
          style={{ width: focusMode ? 0 : undefined }}
        >
          {/* Activity Bar (Icons) - New refactored component */}
          <ActivityBar activeTab={activeSidebarTab} onTabChange={handleTabChange} />

          {/* 
            Sidebar Panel (Content) - Performance-optimized animation
            
            Why this approach:
            - Using width animation would cause layout reflow (expensive)
            - Using transform only affects compositing (GPU accelerated)
            - overflow-hidden clips content during animation
            - will-change hints browser for optimization
          */}
          <div 
            className="h-full overflow-hidden transition-[width] duration-[250ms] ease-out"
            style={{ 
              width: isSidebarOpen ? 260 : 0,
              willChange: 'width',
            }}
          >
            <motion.div
              initial={false}
              animate={{ 
                opacity: isSidebarOpen ? 1 : 0,
              }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full w-[260px]"
            >
            <SidebarPanel
              title={sidebarTitle}
            >
              {/* Files View */}
              {activeSidebarTab === 'files' && (
                <WriteModeFileTree />
              )}
              
              {/* Search View */}
              {activeSidebarTab === 'search' && (
                <div className="p-3 space-y-4">
                  <SearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search in files..."
                  />
                  <div className="text-[11px] text-[var(--fg-muted)] text-center py-10 font-medium">
                    {searchQuery ? `No results for "${searchQuery}"` : 'No recent searches'}
                  </div>
                </div>
              )}
              
              {/* Outline View */}
              {activeSidebarTab === 'outline' && (
                <div className="py-3 px-4 space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--fg-default)]">
                      <span className="w-1 h-3 bg-[var(--accent-default)] rounded-full" />
                      Prologue
                    </div>
                    <div className="pl-3 space-y-2 border-l border-[var(--border-subtle)] ml-0.5">
                      <div className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)] cursor-pointer transition-colors">Scene 1: The Window</div>
                      <div className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)] cursor-pointer transition-colors">Scene 2: The Letter</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--fg-subtle)] opacity-50">
                    <span className="w-1 h-3 bg-[var(--border-strong)] rounded-full" />
                    Chapter 1
                  </div>
                </div>
              )}
              
              {/* History View */}
              {activeSidebarTab === 'history' && (
                <div className="py-2 px-2 space-y-1">
                  {[
                    { time: '10 min ago', desc: 'Refined character intro' },
                    { time: '1 hour ago', desc: 'Added sensory details' },
                    { time: 'Yesterday', desc: 'Draft completed' },
                  ].map((item, i) => (
                    <div key={i} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer group transition-colors">
                      <div className="text-[11px] font-semibold text-[var(--fg-muted)] group-hover:text-[var(--fg-default)]">{item.desc}</div>
                      <div className="text-[9px] text-[var(--fg-subtle)] mt-1 uppercase tracking-wider">{item.time}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Settings View */}
              {activeSidebarTab === 'settings' && (
                <div className="p-4 text-center text-[var(--fg-muted)] text-sm">
                  Settings panel
                </div>
              )}
            </SidebarPanel>
            </motion.div>
          </div>
        </div>

        {/* Middle: The Editor (Main Canvas) */}
        <main className="flex-1 h-full relative min-w-0 bg-[var(--bg-base)]">
          <WriteModeEditorPanel />
        </main>

        {/* 
          Right Side: Intelligence Stack
          
          Why this animation approach:
          - Outer div handles width transition (CSS for simplicity)
          - Inner content uses transform for GPU-accelerated slide
          - Opacity fade adds polish without layout cost
        */}
        <aside 
          data-testid="layout-ai-panel"
          className="h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] overflow-hidden transition-[width] duration-[250ms] ease-out"
          style={{ 
            width: isAiPanelOpen ? 360 : 0,
            willChange: 'width',
          }}
        >
          <motion.div
            initial={false}
            animate={{ 
              opacity: isAiPanelOpen ? 1 : 0,
            }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-[360px] h-full shadow-2xl"
          >
            <AIPanel />
          </motion.div>
        </aside>
      </div>

      {/* 3. Footer: System Status */}
      <div className={focusMode ? 'hidden' : undefined}>
        <Footer
          fileName={fileName}
          saveStatus={saveStatus}
          saveErrorMessage={saveError?.message ?? undefined}
          onRetrySave={handleRetrySave}
          line={cursorPosition.line}
          column={cursorPosition.column}
          encoding="UTF-8"
          language={documentType}
          isConnected={isConnected}
        />
      </div>

      {focusMode && (
        <div
          data-testid="wm-focus-hud"
          className="fixed top-3 right-3 z-[60] px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-lg backdrop-blur-[2px]"
        >
          <div className="text-[11px] font-semibold text-[var(--fg-default)] max-w-[280px] truncate">{fileName}</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--fg-subtle)]">
            <span className="tabular-nums">{wordCount} words</span>
            <span>·</span>
            <span>AI: {aiStatus}</span>
            <span>·</span>
            <span>{saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中…' : saveStatus === 'unsaved' ? '未保存' : '保存失败'}</span>
            <span className="ml-1 text-[var(--fg-muted)]">Esc 退出</span>
          </div>
        </div>
      )}

      <CommandPalette />
    </div>
  );
}
