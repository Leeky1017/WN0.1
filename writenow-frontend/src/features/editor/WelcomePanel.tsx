/**
 * WelcomePanel - 欢迎面板
 * 应用启动时显示的默认面板
 */
import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Loader2, PenLine, Sparkles, Zap } from 'lucide-react';

import { Button } from '@/components/ui';
import { useRpcConnection } from '@/lib/hooks';
import { invoke } from '@/lib/rpc';
import type { ProjectBootstrapResponse } from '@/types/ipc-generated';

/**
 * 欢迎面板组件
 */
export function WelcomePanel() {
  const { status, isConnected, connect } = useRpcConnection({ autoConnect: true });

  const [projectInfo, setProjectInfo] = useState<ProjectBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const handleBootstrap = useCallback(async () => {
    setBootstrapError(null);
    setLoading(true);
    try {
      const result = await invoke('project:bootstrap', {});
      setProjectInfo(result);
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Failed to bootstrap');
      console.error('Failed to bootstrap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 连接后自动获取项目信息
  useEffect(() => {
    if (!isConnected) return;
    if (projectInfo) return;
    void handleBootstrap();
  }, [handleBootstrap, isConnected, projectInfo]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-editor)] p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--blue-700)] flex items-center justify-center shadow-lg">
            <PenLine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">WriteNow</h1>
          <p className="text-[var(--text-secondary)]">AI 驱动的创作 IDE</p>
        </div>

        {/* Connection Status */}
        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-[var(--color-success)]'
                    : status === 'connecting'
                      ? 'bg-[var(--color-warning)] animate-pulse'
                      : 'bg-[var(--text-muted)]'
                }`}
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {isConnected ? (loading ? '初始化中...' : '已连接到后端') : status === 'connecting' ? '连接中...' : '未连接'}
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
              <p className="text-xs text-[var(--text-muted)]">项目 ID: {projectInfo.currentProjectId?.slice(0, 8)}...</p>
            </div>
          )}

          {loading && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>正在初始化项目...</span>
            </div>
          )}

          {bootstrapError && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--color-error)]">{bootstrapError}</p>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={handleBootstrap} disabled={!isConnected || loading}>
                  重试初始化
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[var(--text-secondary)]">快速开始</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)] shadow-sm hover:shadow transition-all duration-200 group"
              type="button"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center transition-all duration-200 group-hover:bg-[var(--accent-primary)]/10 group-hover:scale-105">
                <FolderOpen className="w-5 h-5 text-[var(--text-muted)] transition-colors duration-200 group-hover:text-[var(--accent-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">打开项目</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">继续创作</p>
              </div>
            </button>

            <button
              className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)] shadow-sm hover:shadow transition-all duration-200 group"
              type="button"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center transition-all duration-200 group-hover:bg-[var(--accent-primary)]/10 group-hover:scale-105">
                <Sparkles className="w-5 h-5 text-[var(--text-muted)] transition-colors duration-200 group-hover:text-[var(--accent-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">新建文档</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">开始写作</p>
              </div>
            </button>
          </div>
        </div>

        {/* Feature Highlights - 更精致的标签 */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-muted)]">
            <Zap className="w-3 h-3" />
            <span>AI 辅助写作</span>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-muted)]">
            FlexLayout 布局
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomePanel;
