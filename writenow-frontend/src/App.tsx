/**
 * WriteNow Frontend V2 - Main Application
 * Phase 1: 核心布局
 */

import { useEffect } from 'react';
import { AppLayout, StatusBar } from '@/components/layout';
import { TooltipProvider } from '@/components/ui';
import { useRpcConnection } from '@/lib/hooks';
import { useStatusBarStore } from '@/stores';

/**
 * 主应用组件
 * 使用 FlexLayout 实现 IDE 级别的可拖拽布局
 */
function App() {
  const { isConnected } = useRpcConnection({ autoConnect: true });
  const setConnectionStatus = useStatusBarStore((state) => state.setConnectionStatus);

  // 同步连接状态到 StatusBar Store
  useEffect(() => {
    setConnectionStatus(isConnected);
  }, [isConnected, setConnectionStatus]);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-app)]">
        {/* Main Layout Area */}
        <div className="flex-1 overflow-hidden">
          <AppLayout />
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>
    </TooltipProvider>
  );
}

export default App;
