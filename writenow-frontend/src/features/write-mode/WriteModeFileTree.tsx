/**
 * WriteModeFileTree
 * Why: Render real backend-driven Explorer (file:list/create/read) without static stub data.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FilePlus2, RefreshCw } from 'lucide-react';

import { FileItem } from '@/components/composed/file-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFileTree } from '@/features/file-tree';
import { useEditorFilesStore } from '@/stores/editorFilesStore';
import { useStatusBarStore } from '@/stores/statusBarStore';

import { useWriteModeStore } from './writeModeStore';

function basename(filePath: string): string {
  const normalized = filePath.trim();
  if (!normalized) return '';
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? normalized;
}

export function WriteModeFileTree() {
  const { data, isLoading, error, isConnected, refresh, createFile } = useFileTree();

  const activeFilePath = useWriteModeStore((s) => s.activeFilePath);
  const openFile = useWriteModeStore((s) => s.openFile);
  const isOpening = useWriteModeStore((s) => s.isOpening);

  const byPath = useEditorFilesStore((s) => s.byPath);
  const saveStatus = useStatusBarStore((s) => s.saveStatus);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ documents: true });
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const isBusy = saveStatus === 'saving';

  useEffect(() => {
    if (!isConnected) return;
    if (isLoading || isOpening) return;
    if (error) return;
    if (activeFilePath) return;
    const first = data[0]?.children?.find((n) => !n.isFolder);
    if (!first) return;
    void openFile(first.path).catch(() => {
      // ignore
    });
  }, [activeFilePath, data, error, isConnected, isLoading, isOpening, openFile]);

  const handleToggleFolder = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const handleOpenFile = useCallback(
    async (path: string) => {
      if (!isConnected) return;
      if (isBusy) return;
      try {
        await openFile(path);
      } catch {
        // Why: open/save errors are surfaced via the unified save indicator; keep file tree interaction minimal.
      }
    },
    [isBusy, isConnected, openFile],
  );

  const handleStartCreate = useCallback(() => {
    setCreateError(null);
    setIsCreating(true);
    setNewName('');
  }, []);

  const handleCancelCreate = useCallback(() => {
    setCreateError(null);
    setIsCreating(false);
    setNewName('');
  }, []);

  const handleSubmitCreate = useCallback(async () => {
    if (!isConnected) return;
    if (isBusy) return;
    setCreateError(null);

    try {
      const created = await createFile(newName || 'Untitled');
      setIsCreating(false);
      setNewName('');
      await openFile(created.path);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建文件失败');
    }
  }, [createFile, isBusy, isConnected, newName, openFile]);

  const rendered = useMemo(() => {
    const lines: ReactNode[] = [];

    const walk = (node: (typeof data)[number], depth: number) => {
      const id = node.id;
      if (node.isFolder) {
        const isExpanded = expanded[id] ?? true;
        lines.push(
          <FileItem
            key={id}
            name={node.name}
            type="folder"
            depth={depth}
            expanded={isExpanded}
            onToggleExpand={() => handleToggleFolder(id)}
            onSelect={() => handleToggleFolder(id)}
          />,
        );
        if (isExpanded) {
          for (const child of node.children ?? []) {
            walk(child, depth + 1);
          }
        }
        return;
      }

      const dirty = Boolean(byPath[node.path]?.isDirty);
      const active = Boolean(activeFilePath && node.path === activeFilePath);
      lines.push(
        <FileItem
          key={id}
          name={basename(node.path)}
          type="file"
          depth={depth}
          active={active}
          selected={active}
          modified={dirty}
          onSelect={() => void handleOpenFile(node.path)}
          onDoubleClick={() => void handleOpenFile(node.path)}
        />,
      );
    };

    for (const node of data) {
      walk(node, 0);
    }

    return lines;
  }, [activeFilePath, byPath, data, expanded, handleOpenFile, handleToggleFolder]);

  return (
    <div className="h-full flex flex-col" data-testid="wm-file-tree">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2 flex items-center justify-end gap-2">
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[var(--fg-default)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => void refresh()}
            disabled={!isConnected || isLoading || isBusy}
            title="刷新"
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[var(--fg-default)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            onClick={handleStartCreate}
            disabled={!isConnected || isLoading || isBusy}
            title="新建文件"
          >
            <FilePlus2 size={14} />
          </button>
        </div>

        {!isConnected && (
          <div className="p-3 text-[11px] text-[var(--fg-muted)]">
            未连接到后端：文件列表不可用
          </div>
        )}

        {isConnected && error && (
          <div className="p-3 text-[11px] text-[var(--error)]">{error}</div>
        )}

        {isConnected && isLoading && (
          <div className="p-3 text-[11px] text-[var(--fg-muted)]">加载中…</div>
        )}

        {isConnected && !isLoading && !error && rendered.length === 0 && (
          <div className="p-3 text-[11px] text-[var(--fg-muted)]">暂无文档，点击右上角新建文件。</div>
        )}

        <div className="py-2 px-2 space-y-0.5">{rendered}</div>
      </div>

      {isCreating && (
        <div className="shrink-0 p-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
          <Input
            inputSize="sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="未命名"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelCreate();
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSubmitCreate();
              }
            }}
            autoFocus
            disabled={!isConnected || isBusy}
            aria-label="New file name"
          />
          {createError && <div className="text-[11px] text-[var(--error)]">{createError}</div>}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancelCreate}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSubmitCreate()}
              disabled={!isConnected || isBusy}
              leftIcon={<FilePlus2 size={14} />}
            >
              新建
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WriteModeFileTree;

