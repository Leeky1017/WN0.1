/**
 * WriteNow Frontend V2 - Main Application
 * Phase 1: 核心布局
 */

import { useEffect, useState } from 'react';
import { AppLayout, StatusBar, type LayoutApi } from '@/components/layout';
import { Toaster, TooltipProvider } from '@/components/ui';
import { useGlobalHotkeys } from '@/hooks/useGlobalHotkeys';
import { useRpcConnection } from '@/lib/hooks';
import { useCommandPaletteStore, useSettingsPanelStore, useStatusBarStore, useThemeStore } from '@/stores';

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

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-app)]">
        {/* Main Layout Area */}
        <div className="flex-1 overflow-hidden">
          <AppLayout onApiReady={setLayoutApi} />
        </div>

        {/* Status Bar */}
        <StatusBar />

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
