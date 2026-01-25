/**
 * VersionHistoryPanel
 * Why: Let users list/preview/diff/restore versions for the active document (articleId == file path).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';

import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { invoke } from '@/lib/rpc';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useEditorRuntimeStore } from '@/stores';
import type { VersionListItem } from '@/types/ipc-generated';

import { VersionItem } from './VersionItem';
import { VersionDiff } from './VersionDiff';

type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: T };

function getMarkdownFromEditor(editor: unknown): string {
  const maybe = editor as { getMarkdown?: () => string; storage?: { markdown?: { getMarkdown?: () => string } } };
  if (typeof maybe.getMarkdown === 'function') return maybe.getMarkdown();
  const storageFn = maybe.storage?.markdown?.getMarkdown;
  if (typeof storageFn === 'function') return storageFn();
  const fallback = editor as { getText?: () => string };
  return typeof fallback.getText === 'function' ? fallback.getText() : '';
}

function VersionHistoryInner({ articleId }: { articleId: string }) {
  const activeEditor = useEditorRuntimeStore((s) => s.activeEditor);

  const [snapshots, setSnapshots] = useState<LoadState<VersionListItem[]>>({ status: 'idle' });
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [preview, setPreview] = useState<LoadState<string>>({ status: 'idle' });

  const [diffLeftId, setDiffLeftId] = useState<string | null>(null);
  const [diffRightId, setDiffRightId] = useState<string | null>(null);
  const [diffState, setDiffState] = useState<LoadState<string>>({ status: 'idle' });

  const refresh = useCallback(async () => {
    setSnapshots({ status: 'loading' });
    try {
      const res = await invoke('version:list', { articleId, limit: 50, cursor: '0' });
      setSnapshots({ status: 'ready', value: res.items });
    } catch (error) {
      setSnapshots({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load versions' });
    }
  }, [articleId]);

  useEffect(() => {
    // Why: Kick off initial load asynchronously to satisfy strict lint rules around setState-in-effect.
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const loadPreview = useCallback(async (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
    setPreview({ status: 'loading' });
    try {
      const res = await invoke('version:restore', { snapshotId });
      setPreview({ status: 'ready', value: res.content });
    } catch (error) {
      setPreview({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load snapshot' });
    }
  }, []);

  const restoreSnapshot = useCallback(async () => {
    const snapshotId = selectedSnapshotId;
    if (!snapshotId) return;
    if (!articleId) return;
    try {
      const res = await invoke('version:restore', { snapshotId });
      // Apply to editor immediately; also persist to disk to keep backend in sync.
      if (activeEditor) {
        activeEditor.commands.setContent(res.content, { emitUpdate: true, contentType: 'markdown' });
      }
      await invoke('file:write', { path: articleId, content: res.content });
      toast.success('已恢复版本');
      await refresh();
    } catch (error) {
      toast.error('恢复失败', { description: error instanceof Error ? error.message : String(error) });
    }
  }, [activeEditor, articleId, refresh, selectedSnapshotId]);

  const createSnapshot = useCallback(async () => {
    if (!articleId || !activeEditor) {
      toast.error('无法创建快照', { description: '请先打开文件' });
      return;
    }
    const nameRaw = window.prompt('快照名称（可选）', '');
    if (nameRaw === null) return;
    const reasonRaw = window.prompt('快照原因（可选）', '');
    if (reasonRaw === null) return;

    try {
      const content = getMarkdownFromEditor(activeEditor);
      const res = await invoke('version:create', {
        articleId,
        content,
        name: nameRaw.trim() || undefined,
        reason: reasonRaw.trim() || undefined,
        actor: 'user',
      });
      toast.success('已创建快照');
      await refresh();
      void loadPreview(res.snapshotId);
    } catch (error) {
      toast.error('创建快照失败', { description: error instanceof Error ? error.message : String(error) });
    }
  }, [activeEditor, articleId, loadPreview, refresh]);

  const availableSnapshots = useMemo(() => (snapshots.status === 'ready' ? snapshots.value : []), [snapshots]);

  const loadDiff = useCallback(async (fromSnapshotId: string | null, toSnapshotId: string | null) => {
    if (!fromSnapshotId || !toSnapshotId || fromSnapshotId === toSnapshotId) {
      setDiffState({ status: 'idle' });
      return;
    }
    setDiffState({ status: 'loading' });
    try {
      const res = await invoke('version:diff', { fromSnapshotId, toSnapshotId });
      setDiffState({ status: 'ready', value: res.diff });
    } catch (error) {
      setDiffState({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load diff' });
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">版本历史</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={!articleId}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button size="sm" onClick={() => void createSnapshot()} disabled={!articleId}>
            <Plus className="w-4 h-4 mr-1" />
            快照
          </Button>
        </div>
      </div>

      {!articleId ? (
        <div className="p-4 text-sm text-[var(--text-muted)]">打开文件后可查看版本历史</div>
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {/* List */}
          <div className="w-80 border-r border-[var(--border-subtle)] overflow-auto p-2">
            {snapshots.status === 'loading' && <div className="p-2 text-xs text-[var(--text-muted)]">加载中…</div>}
            {snapshots.status === 'error' && (
              <div className="p-2 text-xs text-[var(--color-error)]">{snapshots.message}</div>
            )}
            {snapshots.status === 'ready' && snapshots.value.length === 0 && (
              <div className="p-2 text-xs text-[var(--text-muted)]">暂无快照</div>
            )}
            {snapshots.status === 'ready' &&
              snapshots.value.map((item) => (
                <div key={item.id} className="mb-1">
                  <VersionItem
                    item={item}
                    selected={item.id === selectedSnapshotId}
                    onSelect={() => void loadPreview(item.id)}
                    onRestore={() => void restoreSnapshot()}
                  />
                </div>
              ))}
          </div>

          {/* Preview + Diff */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="text-xs text-[var(--text-muted)]">
              当前文档：<span className="font-mono">{articleId}</span>
            </div>

            {preview.status === 'idle' ? (
              <div className="text-sm text-[var(--text-muted)]">选择一个快照以预览内容</div>
            ) : preview.status === 'loading' ? (
              <div className="text-sm text-[var(--text-muted)]">加载快照…</div>
            ) : preview.status === 'error' ? (
              <div className="text-sm text-[var(--color-error)]">{preview.message}</div>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-secondary)]">快照预览</div>
                  <Button size="sm" onClick={() => void restoreSnapshot()} disabled={!selectedSnapshotId}>
                    恢复到此版本
                  </Button>
                </div>
                <pre className={cn('max-h-64 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap break-words')}>
                  {preview.value}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">From</div>
                <Select
                  value={diffLeftId ?? ''}
                  onValueChange={(v) => {
                    const next = v || null;
                    setDiffLeftId(next);
                    void loadDiff(next, diffRightId);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择快照" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSnapshots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name || s.createdAt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">To</div>
                <Select
                  value={diffRightId ?? ''}
                  onValueChange={(v) => {
                    const next = v || null;
                    setDiffRightId(next);
                    void loadDiff(diffLeftId, next);
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="选择快照" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSnapshots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name || s.createdAt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {diffState.status === 'loading' && <div className="text-sm text-[var(--text-muted)]">计算 Diff…</div>}
            {diffState.status === 'error' && <div className="text-sm text-[var(--color-error)]">{diffState.message}</div>}
            {diffState.status === 'ready' && <VersionDiff diff={diffState.value} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionHistoryPanel;

export function VersionHistoryPanel() {
  const activeFilePath = useEditorRuntimeStore((s) => s.activeFilePath);
  const articleId = useMemo(() => (activeFilePath ?? '').trim() || null, [activeFilePath]);

  if (!articleId) {
    return (
      <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">版本历史</div>
        </div>
        <div className="p-4 text-sm text-[var(--text-muted)]">打开文件后可查看版本历史</div>
      </div>
    );
  }

  return <VersionHistoryInner key={articleId} articleId={articleId} />;
}
