/**
 * WelcomePanel - 欢迎面板
 * 应用启动时显示的默认面板
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { useRpcConnection } from '@/lib/hooks';
import { invoke } from '@/lib/rpc';
import type { ProjectBootstrapResponse } from '@/types/ipc-generated';
import { Sparkles, FolderOpen, PenLine, Zap } from 'lucide-react';

/**
 * 欢迎面板组件
 */
export function WelcomePanel() {
  const { status, isConnected, connect } = useRpcConnection({
    autoConnect: true,
  });
  
  const [projectInfo, setProjectInfo] = useState<ProjectBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // 连接后自动获取项目信息
  useEffect(() => {
    if (isConnected && !projectInfo) {
      handleBootstrap();
    }
  }, [isConnected]);

  const handleBootstrap = async () => {
    setLoading(true);
    try {
      const result = await invoke('project:bootstrap', {});
      setProjectInfo(result);
    } catch (err) {
      console.error('Failed to bootstrap:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-editor)] p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--blue-700)] flex items-center justify-center shadow-lg">
            <PenLine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            WriteNow
          </h1>
          <p className="text-[var(--text-secondary)]">
            AI 驱动的创作 IDE
          </p>
        </div>

        {/* Connection Status */}
        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[var(--color-success)]' : 
                status === 'connecting' ? 'bg-[var(--color-warning)] animate-pulse' :
                'bg-[var(--text-muted)]'
              }`} />
              <span className="text-sm text-[var(--text-secondary)]">
                {isConnected ? '已连接到后端' : 
                 status === 'connecting' ? '连接中...' :
                 '未连接'}
              </span>
            </div>
            {!isConnected && status !== 'connecting' && (
              <Button size="sm" variant="outline" onClick={connect}>
                连接
              </Button>
            )}
          </div>

          {projectInfo && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)]">
                项目 ID: {projectInfo.currentProjectId?.slice(0, 8)}...
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">快速开始</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-input)] flex items-center justify-center group-hover:bg-[var(--accent)]/10">
                <FolderOpen className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">打开项目</p>
                <p className="text-xs text-[var(--text-muted)]">继续创作</p>
              </div>
            </button>

            <button className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-input)] flex items-center justify-center group-hover:bg-[var(--accent)]/10">
                <Sparkles className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">新建文档</p>
                <p className="text-xs text-[var(--text-muted)]">开始写作</p>
              </div>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="flex items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>AI 辅助写作</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>•</span>
            <span>FlexLayout 布局</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>•</span>
            <span>Phase 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomePanel;
