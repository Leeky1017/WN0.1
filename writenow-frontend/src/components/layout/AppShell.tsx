import { useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ActivityBar, type SidebarTab } from './activity-bar';
import { SidebarPanel } from './sidebar-panel';
import { Header } from './header';
import { Footer } from './footer';
import { MobileOverlay } from './MobileOverlay';
import { Toaster } from '@/components/ui/toaster';
import { transitions } from '@/lib/motion';
import { useConnectionToast } from '@/lib/hooks/useConnectionToast';

import { AIPanel } from '@/features/ai-panel/AIPanel';
import { CommandPalette } from '@/features/command-palette';
import { CrashRecoveryDialog } from '@/features/crash-recovery/CrashRecoveryDialog';
import { ExportDialog } from '@/features/export/ExportDialog';
import { MemoryPanel } from '@/features/memory/MemoryPanel';
import { OutlinePanel } from '@/features/outline/OutlinePanel';
import { ProjectsPanel } from '@/features/projects/ProjectsPanel';
import { SearchPanel } from '@/features/search/SearchPanel';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { SkillsPanel } from '@/features/skills/SkillsPanel';
import { VersionHistoryPanel } from '@/features/version-history/VersionHistoryPanel';
import { WriteModeEditorPanel } from '@/features/write-mode/WriteModeEditorPanel';
import { WriteModeFileTree } from '@/features/write-mode/WriteModeFileTree';
import { useWriteModeStore } from '@/features/write-mode/writeModeStore';
import { createShortcutsHandler } from '@/lib/keyboard';
import { useBreakpoint } from '@/lib/responsive';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useExportDialogStore } from '@/stores/exportDialogStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAIStore } from '@/stores/aiStore';
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
  const { t } = useTranslation();
  const togglePalette = useCommandPaletteStore((s) => s.togglePalette);

  // Export dialog state
  const exportDialogOpen = useExportDialogStore((s) => s.open);
  const closeExportDialog = useExportDialogStore((s) => s.closeDialog);

  // Connection toast notifications
  useConnectionToast();

  // Responsive breakpoint
  const { breakpoint, isMobile } = useBreakpoint();
  const setBreakpoint = useLayoutStore((s) => s.setBreakpoint);

  const sidebarCollapsed = useLayoutStore((s) => s.sidebarCollapsed);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const focusMode = useLayoutStore((s) => s.focusMode);
  const activeSidebarTab = useLayoutStore((s) => s.activeSidebarView);
  const setActiveSidebarView = useLayoutStore((s) => s.setActiveSidebarView);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);
  const toggleFocusMode = useLayoutStore((s) => s.toggleFocusMode);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toggleRightPanel = useLayoutStore((s) => s.toggleRightPanel);
  const mobileOverlayOpen = useLayoutStore((s) => s.mobileOverlayOpen);
  const setMobileOverlay = useLayoutStore((s) => s.setMobileOverlay);

  // Sync breakpoint to store
  useEffect(() => {
    setBreakpoint(breakpoint);
  }, [breakpoint, setBreakpoint]);

  // On mobile, inline panels are always collapsed; overlays are used instead
  const isSidebarOpen = isMobile ? false : (!sidebarCollapsed && !focusMode);
  const isAiPanelOpen = isMobile ? false : (!rightPanelCollapsed && !focusMode);

  const activeFilePath = useWriteModeStore((s) => s.activeFilePath);
  const markdown = useWriteModeStore((s) => s.markdown);
  const saveNow = useWriteModeStore((s) => s.saveNow);

  const saveStatus = useStatusBarStore((s) => s.saveStatus);
  const saveError = useStatusBarStore((s) => s.saveError);
  const aiStatus = useStatusBarStore((s) => s.aiStatus);
  const wordCount = useStatusBarStore((s) => s.wordCount);
  const charCount = useStatusBarStore((s) => s.charCount);
  const isConnected = useStatusBarStore((s) => s.isConnected);
  const cursorPosition = useStatusBarStore((s) => s.cursorPosition);
  const documentType = useStatusBarStore((s) => s.documentType);
  const reviewingAiChanges = useAIStore((s) => Boolean(s.diff));

  // Why: 100k chars is the large-doc threshold in the perf spec; surface the mode before degradation kicks in.
  const LARGE_DOCUMENT_WARNING_CHARS = 100_000;
  const isLargeDocument = charCount >= LARGE_DOCUMENT_WARNING_CHARS;

  const fileName = useMemo(() => {
    if (!activeFilePath) return 'Untitled';
    const parts = activeFilePath.split('/');
    return parts[parts.length - 1] ?? activeFilePath;
  }, [activeFilePath]);

  /**
   * Handle tab change with smart toggle behavior.
   * Clicking active tab collapses sidebar, clicking other tab opens it.
   * On mobile, this operates on the overlay instead.
   */
  const handleTabChange = useCallback((tab: SidebarTab) => {
    if (isMobile) {
      // On mobile, always show the overlay and switch tabs
      setActiveSidebarView(tab);
      if (mobileOverlayOpen !== 'sidebar') {
        setMobileOverlay('sidebar');
      }
      return;
    }
    if (tab === activeSidebarTab) {
      toggleSidebar();
      return;
    }
    setActiveSidebarView(tab);
    setSidebarCollapsed(false);
  }, [activeSidebarTab, isMobile, mobileOverlayOpen, setActiveSidebarView, setMobileOverlay, setSidebarCollapsed, toggleSidebar]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleToggleAiPanel = useCallback(() => {
    toggleRightPanel();
  }, [toggleRightPanel]);

  /** Map sidebar tab to display title */
  const sidebarTitle = useMemo(() => {
    return t(`sidebar.title.${activeSidebarTab}`);
  }, [activeSidebarTab, t]);

  const handleRetrySave = useCallback(() => {
    void saveNow('retry').catch(() => {
      // Why: save errors are surfaced via unified indicators; retry is best-effort.
    });
  }, [saveNow]);

  // Global keyboard shortcuts
  useEffect(() => {
    // App-level shortcuts (Cmd+K, Cmd+\)
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

  // Editor formatting shortcuts (Cmd+B/I/E, Cmd+/, Cmd+Shift+P)
  useEffect(() => {
    const cleanup = createShortcutsHandler();
    return cleanup;
  }, []);

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
          reviewingAiChanges={reviewingAiChanges}
          saveStatus={saveStatus}
          saveErrorMessage={saveError?.message ?? undefined}
          onRetrySave={handleRetrySave}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          isAiPanelOpen={isAiPanelOpen}
          onToggleAiPanel={handleToggleAiPanel}
          performanceMode={isLargeDocument}
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
              transition={transitions.normal}
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
                <SearchPanel />
              )}
              
              {/* Outline View */}
              {activeSidebarTab === 'outline' && (
                <OutlinePanel />
              )}
              
              {/* History View */}
              {activeSidebarTab === 'history' && (
                <VersionHistoryPanel />
              )}
              
              {/* Memory View */}
              {activeSidebarTab === 'memory' && (
                <MemoryPanel />
              )}
              
              {/* Skills View */}
              {activeSidebarTab === 'skills' && (
                <SkillsPanel />
              )}
              
              {/* Projects View */}
              {activeSidebarTab === 'projects' && (
                <ProjectsPanel />
              )}
              
              {/* Settings View */}
              {activeSidebarTab === 'settings' && (
                <SettingsPanel />
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
            transition={transitions.normal}
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
          {reviewingAiChanges && (
            <div className="mt-1 text-[10px] font-semibold text-[var(--accent-default)]">Reviewing AI changes</div>
          )}
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
      
      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeExportDialog();
        }}
        title={fileName}
        content={markdown}
      />

      {/* Crash Recovery Dialog - shown on startup if unclean exit detected */}
      <CrashRecoveryDialog
        onRecovered={(path, content) => {
          // Why: After recovery, we should reload the file in the editor.
          // The writeModeStore should handle this via its file loading mechanism.
          console.log(`[CrashRecovery] Recovered file: ${path} (${content.length} chars)`);
        }}
      />

      {/* Mobile Overlays - only rendered on mobile breakpoint */}
      {isMobile && (
        <>
          {/* Sidebar Overlay */}
          <MobileOverlay
            open={mobileOverlayOpen === 'sidebar'}
            onClose={() => setMobileOverlay(null)}
            side="left"
            title={sidebarTitle}
          >
            <div className="flex h-full">
              <ActivityBar activeTab={activeSidebarTab} onTabChange={handleTabChange} />
              <SidebarPanel title={sidebarTitle} className="flex-1 w-auto border-r-0">
                {activeSidebarTab === 'files' && <WriteModeFileTree />}
                {activeSidebarTab === 'search' && <SearchPanel />}
                {activeSidebarTab === 'outline' && <OutlinePanel />}
                {activeSidebarTab === 'history' && <VersionHistoryPanel />}
                {activeSidebarTab === 'memory' && <MemoryPanel />}
                {activeSidebarTab === 'skills' && <SkillsPanel />}
                {activeSidebarTab === 'projects' && <ProjectsPanel />}
                {activeSidebarTab === 'settings' && <SettingsPanel />}
              </SidebarPanel>
            </div>
          </MobileOverlay>

          {/* AI Panel Overlay */}
          <MobileOverlay
            open={mobileOverlayOpen === 'ai'}
            onClose={() => setMobileOverlay(null)}
            side="right"
            title="AI Assistant"
            className="w-[320px] max-w-[calc(100vw-48px)]"
          >
            <AIPanel />
          </MobileOverlay>
        </>
      )}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
