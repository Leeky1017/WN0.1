/**
 * HistoryView - 版本历史侧边栏视图
 * Why: 显示当前文件的版本历史，支持查看和恢复历史版本
 * 数据来自 version:list API
 */

import { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, Eye, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { invoke } from '@/lib/rpc/api';
import { toast } from '@/lib/toast';
import { useEditorRuntimeStore } from '@/stores';
import type { VersionListItem } from '@/types/ipc-generated';

interface HistoryViewProps {
  selectedFile: string | null;
}

/** 格式化相对时间 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${diffDays} 天前`;
}

/** 根据 actor 获取显示标签 */
function getActorLabel(actor: VersionListItem['actor'], name?: string): string {
  if (name) return name;
  switch (actor) {
    case 'user':
      return '手动保存';
    case 'ai':
      return 'AI 保存';
    case 'auto':
    default:
      return '自动保存';
  }
}

export function HistoryView({ selectedFile }: HistoryViewProps) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const activeEditor = useEditorRuntimeStore((s) => s.activeEditor);

  // 加载版本历史
  const loadVersions = useCallback(async (articleId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await invoke('version:list', { articleId, limit: 20, cursor: '0' });
      setVersions(res.items);
    } catch (err) {
      console.error('[HistoryView] Failed to load versions:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 监听 selectedFile 变化
  useEffect(() => {
    if (selectedFile) {
      void loadVersions(selectedFile);
    } else {
      setVersions([]);
      setError(null);
    }
  }, [selectedFile, loadVersions]);

  // 预览版本
  const handlePreview = useCallback(async (snapshotId: string) => {
    setPreviewingId(snapshotId);
    try {
      const res = await invoke('version:restore', { snapshotId });
      // 显示预览内容（这里用 toast 简单提示，实际可打开 diff 视图）
      toast.info('预览内容', {
        description: `${res.content.slice(0, 100)}${res.content.length > 100 ? '...' : ''}`,
      });
    } catch (err) {
      toast.error('预览失败', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setPreviewingId(null);
    }
  }, []);

  // 恢复版本
  const handleRestore = useCallback(async (snapshotId: string) => {
    if (!selectedFile) return;
    
    setRestoringId(snapshotId);
    try {
      const res = await invoke('version:restore', { snapshotId });
      
      // 更新编辑器内容
      if (activeEditor) {
        activeEditor.commands.setContent(res.content, { emitUpdate: true, contentType: 'markdown' });
      }
      
      // 同时写入文件
      await invoke('file:write', { path: selectedFile, content: res.content });
      
      toast.success('已恢复版本');
      
      // 刷新版本列表
      await loadVersions(selectedFile);
    } catch (err) {
      toast.error('恢复失败', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setRestoringId(null);
    }
  }, [selectedFile, activeEditor, loadVersions]);

  return (
    <>
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">
          版本历史
        </span>
        {selectedFile && (
          <button
            data-testid="history-refresh"
            onClick={() => void loadVersions(selectedFile)}
            disabled={loading}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--text-tertiary)] ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto" data-testid="history-list">
        {!selectedFile ? (
          <div className="p-4 text-center">
            <History className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--text-tertiary)]">
              选择文件后查看版本历史
            </p>
          </div>
        ) : loading ? (
          <div className="p-4 text-center">
            <RefreshCw className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2 animate-spin" />
            <p className="text-[13px] text-[var(--text-tertiary)]">加载中...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-[13px] text-red-500">{error}</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center">
            <History className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--text-tertiary)]">暂无版本记录</p>
          </div>
        ) : (
          <div className="py-2">
            {/* 当前文件信息 */}
            <div className="px-3 py-2 mb-2 border-b border-[var(--border-subtle)]">
              <div className="text-[12px] text-[var(--text-secondary)] truncate">
                {selectedFile.split('/').pop()}
              </div>
              <div
                data-testid="history-version-count"
                className="text-[10px] text-[var(--text-tertiary)] mt-0.5"
              >
                {versions.length} 个版本
              </div>
            </div>

            {/* 版本列表 */}
            <div className="space-y-1">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  data-testid={`history-version-${version.id}`}
                  className={`group px-3 py-2 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${
                    index === 0 ? 'bg-[var(--bg-hover)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 ${
                        version.actor === 'user'
                          ? 'bg-[var(--accent-primary)]'
                          : version.actor === 'ai'
                          ? 'bg-blue-500'
                          : 'bg-[var(--text-tertiary)]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--text-primary)]">
                          {getActorLabel(version.actor, version.name)}
                        </span>
                        {index === 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)] text-white">
                            最新
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {formatRelativeTime(version.createdAt)}
                        </span>
                        {version.reason && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            · {version.reason}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 操作按钮 */}
                    {index > 0 && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          data-testid={`history-preview-${version.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handlePreview(version.id);
                          }}
                          disabled={previewingId === version.id}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-active)] transition-colors disabled:opacity-50"
                          title="预览此版本"
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                        <button
                          data-testid={`history-restore-${version.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRestore(version.id);
                          }}
                          disabled={restoringId === version.id}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-active)] transition-colors disabled:opacity-50"
                          title="恢复此版本"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 text-[var(--text-tertiary)] ${restoringId === version.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - 说明 */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
        <div className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-primary)] mr-1 align-middle" />
          用户
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-3 mr-1 align-middle" />
          AI
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--text-tertiary)] ml-3 mr-1 align-middle" />
          自动
        </div>
      </div>
    </>
  );
}

export default HistoryView;
