/**
 * WriteNow Frontend V2 - Main Application
 * Figma 样式改造：新增 MenuBar / StatsBar / ActivityBar / SidebarPanel
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AppLayout,
  StatusBar,
  MenuBar,
  StatsBar,
  ActivityBar,
  SidebarPanel,
  type LayoutApi,
  type SidebarView,
} from '@/components/layout';
import { Toaster, TooltipProvider } from '@/components/ui';
import { useGlobalHotkeys } from '@/hooks/useGlobalHotkeys';
import { useRpcConnection } from '@/lib/hooks';
import {
  useCommandPaletteStore,
  useSettingsPanelStore,
  useStatusBarStore,
  useThemeStore,
} from '@/stores';

import { CommandPalette } from '@/features/command-palette/CommandPalette';
import { SettingsPanel } from '@/features/settings/SettingsPanel';

/**
 * 主应用组件
 * 使用 FlexLayout 实现 IDE 级别的可拖拽布局
 */
function App() {
  const { isConnected } = useRpcConnection({ autoConnect: true });
  const setConnectionStatus = useStatusBarStore((state) => state.setConnectionStatus);
  const initTheme = useThemeStore((s) => s.init);
  const openSettingsPanel = useSettingsPanelStore((s) => s.openPanel);
  const openCommandPalette = useCommandPaletteStore((s) => s.openPalette);

  const [layoutApi, setLayoutApi] = useState<LayoutApi | null>(null);

  // Figma 样式新增状态
  const [statsBarOpen, setStatsBarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  // TODO: editorContent will be used to pass to OutlineView for heading extraction
  const [editorContent] = useState('');

  useGlobalHotkeys({
    openCommandPalette,
    openSettings: openSettingsPanel,
  });

  // 同步连接状态到 StatusBar Store
  useEffect(() => {
    setConnectionStatus(isConnected);
  }, [isConnected, setConnectionStatus]);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // ESC 退出专注模式
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  const handleSelectFile = useCallback(
    (file: string) => {
      setSelectedFile(file);
      layoutApi?.openEditorTab(file);
    },
    [layoutApi],
  );

  const handleToggleAiPanel = useCallback(() => {
    layoutApi?.focusAiPanel();
  }, [layoutApi]);

  const handleOpenStats = useCallback(() => {
    setSidebarView('stats');
  }, []);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* 顶部菜单栏 */}
        {!focusMode && (
          <MenuBar
            statsBarOpen={statsBarOpen}
            onToggleStatsBar={() => setStatsBarOpen(!statsBarOpen)}
            onToggleFocusMode={() => setFocusMode(!focusMode)}
            onToggleAiPanel={handleToggleAiPanel}
          />
        )}

        {/* 统计栏 */}
        {!focusMode && statsBarOpen && <StatsBar onOpenStats={handleOpenStats} />}

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* ActivityBar - 左侧图标导航栏 */}
          {!focusMode && (
            <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />
          )}

          {/* SidebarPanel - 侧边栏面板 */}
          {!focusMode && (
            <SidebarPanel
              view={sidebarView}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
              editorContent={editorContent}
            />
          )}

          {/* FlexLayout 区域（编辑器 + AI 面板） */}
          <div className="flex-1 overflow-hidden relative">
            <AppLayout onApiReady={setLayoutApi} />
          </div>
        </div>

        {/* Status Bar */}
        {!focusMode && <StatusBar />}

        {/* Focus Mode Exit Hint */}
        {focusMode && (
          <div className="fixed top-4 right-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded px-3 py-2 flex items-center gap-2 shadow-lg animate-fade-in z-50">
            <span className="text-[11px] text-[var(--text-tertiary)]">
              按 ESC 退出专注模式
            </span>
            <button
              onClick={() => setFocusMode(false)}
              className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
            >
              退出
            </button>
          </div>
        )}

        {/* Global overlays */}
        <CommandPalette
          openFile={(path) => layoutApi?.openEditorTab(path)}
          focusAiPanel={() => layoutApi?.focusAiPanel()}
          openSettings={() => openSettingsPanel()}
        />
        <SettingsPanel />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export default App;
