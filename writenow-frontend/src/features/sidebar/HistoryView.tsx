/**
 * HistoryView - 版本历史视图（Sidebar 入口）
 * Why: 与 `VersionHistoryPanel` 功能重复，本视图提供轻量入口：
 * - 列出当前文件的快照版本（version:list）
 * - 预览/恢复指定版本（version:restore + file:write）
 *
 * 约束：必须使用真实后端数据；禁止 mock 数据出现在生产代码中。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RotateCcw, Eye, Clock, RefreshCw } from 'lucide-react';

import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { invoke } from '@/lib/rpc';
import { toast } from '@/lib/toast';
import { useEditorRuntimeStore } from '@/stores';
import type { VersionListItem } from '@/types/ipc-generated';

interface HistoryViewProps {
  selectedFile: string | null;
}

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: T };

function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate);
  const now = new Date();

  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${diffDays} 天前`;
}

function getFileName(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return '';
  return trimmed.split('/').pop() ?? trimmed;
}

export function HistoryView({ selectedFile }: HistoryViewProps) {
  const activeEditor = useEditorRuntimeStore((s) => s.activeEditor);
  const activeFilePath = useEditorRuntimeStore((s) => s.activeFilePath);

  const articleId = useMemo(() => (selectedFile ?? '').trim() || null, [selectedFile]);

  const [snapshots, setSnapshots] = useState<LoadState<VersionListItem[]>>({ status: 'idle' });
  const [preview, setPreview] = useState<LoadState<{ snapshotId: string; content: string }>>({ status: 'idle' });
  const [previewOpen, setPreviewOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!articleId) return;
    setSnapshots({ status: 'loading' });
    try {
      const res = await invoke('version:list', { articleId, limit: 50, cursor: '0' });
      setSnapshots({ status: 'ready', value: res.items });
    } catch (error) {
      setSnapshots({ status: 'error', message: error instanceof Error ? error.message : '加载版本失败' });
    }
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;
    queueMicrotask(() => {
      void refresh();
    });
  }, [articleId, refresh]);

  const openPreview = useCallback(async (snapshotId: string) => {
    setPreviewOpen(true);
    setPreview({ status: 'loading' });
    try {
      const res = await invoke('version:restore', { snapshotId });
      setPreview({ status: 'ready', value: { snapshotId, content: res.content } });
    } catch (error) {
      setPreview({ status: 'error', message: error instanceof Error ? error.message : '加载预览失败' });
    }
  }, []);

  const restoreSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!articleId) return;
      try {
        const res = await invoke('version:restore', { snapshotId });

        // Apply to active editor when it matches the selected file.
        if (activeEditor && activeFilePath && activeFilePath === articleId) {
          activeEditor.commands.setContent(res.content, { emitUpdate: true, contentType: 'markdown' });
        }

        await invoke('file:write', { path: articleId, content: res.content });
        toast.success('已恢复版本');
        await refresh();
      } catch (error) {
        toast.error('恢复失败', { description: error instanceof Error ? error.message : String(error) });
      }
    },
    [activeEditor, activeFilePath, articleId, refresh],
  );

  const count = snapshots.status === 'ready' ? snapshots.value.length : 0;

  return (
    <>
      {/* Header */}
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          版本历史
        </span>
        <Button
          data-testid="history-refresh"
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={!articleId || snapshots.status === 'loading'}
          title="刷新版本列表"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          刷新
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {!articleId ? (
          <div className="p-4 text-center">
            <History className="w-8 h-8 text-[var(--fg-subtle)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--fg-subtle)]">选择文件后查看版本历史</p>
          </div>
        ) : snapshots.status === 'loading' ? (
          <div className="p-4 text-center">
            <p className="text-[13px] text-[var(--fg-subtle)]">加载中...</p>
          </div>
        ) : snapshots.status === 'error' ? (
          <div className="p-4 text-center">
            <p className="text-[13px] text-[var(--error)]">{snapshots.message}</p>
            <button
              className="mt-2 text-[11px] text-[var(--accent-default)] hover:underline"
              type="button"
              onClick={() => void refresh()}
            >
              重试
            </button>
          </div>
        ) : (
          <div className="py-2">
            {/* 当前文件信息 */}
            <div className="px-3 py-2 mb-2 border-b border-[var(--border-subtle)]">
              <div className="text-[12px] text-[var(--fg-muted)] truncate" data-testid="history-selected-file">
                {getFileName(articleId)}
              </div>
              <div className="text-[10px] text-[var(--fg-subtle)] mt-0.5" data-testid="history-version-count">
                {count} 个版本
              </div>
            </div>

            {/* 版本列表 */}
            <div className="space-y-1" data-testid="history-list">
              {snapshots.status === 'ready' && snapshots.value.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <div className="text-[13px] text-[var(--fg-subtle)] mb-1">暂无版本</div>
                  <div className="text-[11px] text-[var(--fg-subtle)]">创建快照后将在此处显示</div>
                </div>
              ) : (
                snapshots.status === 'ready' &&
                snapshots.value.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`history-version-${item.id}`}
                    className="group px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors duration-[100ms]"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 bg-[var(--fg-subtle)]"
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[var(--fg-default)] truncate">
                            {item.name ?? '快照'}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--fg-subtle)]">
                            {item.actor}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-[var(--fg-subtle)]" />
                          <span className="text-[10px] text-[var(--fg-subtle)]">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        {item.reason && (
                          <div className="text-[10px] text-[var(--fg-subtle)] mt-0.5 line-clamp-2">
                            {item.reason}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-[100ms]">
                        <button
                          data-testid={`history-preview-${item.id}`}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-active)] transition-colors duration-[100ms]"
                          title="预览此版本"
                          type="button"
                          onClick={() => void openPreview(item.id)}
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
                        </button>
                        <button
                          data-testid={`history-restore-${item.id}`}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-active)] transition-colors duration-[100ms]"
                          title="恢复此版本"
                          type="button"
                          onClick={() => void restoreSnapshot(item.id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>版本预览</DialogTitle>
          </DialogHeader>
          {preview.status === 'idle' ? null : preview.status === 'loading' ? (
            <div className="text-sm text-[var(--fg-subtle)]">加载中...</div>
          ) : preview.status === 'error' ? (
            <div className="text-sm text-[var(--error)]">{preview.message}</div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-xs font-mono">
              {preview.value.content}
            </pre>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              type="button"
              title="关闭预览"
            >
              关闭
            </Button>
            <Button
              onClick={() => {
                if (preview.status !== 'ready') return;
                void restoreSnapshot(preview.value.snapshotId);
              }}
              disabled={preview.status !== 'ready' || !articleId}
              type="button"
              title="恢复该版本"
            >
              恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HistoryView;
