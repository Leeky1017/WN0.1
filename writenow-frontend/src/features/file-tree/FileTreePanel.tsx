/**
 * FileTreePanel - 文件树面板
 * 使用 react-arborist 实现高性能虚拟化文件树
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Tree, type NodeApi, type TreeApi } from 'react-arborist';
import { FilePlus, Loader2, RefreshCw } from 'lucide-react';

import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@/components/ui';
import { useFileTree } from './useFileTree';
import { FileNode as FileNodeRenderer } from './FileNode';
import { FileContextMenu } from './FileContextMenu';
import type { FileNode as FileNodeType, FileOperation } from './types';
import { useLayoutApi } from '@/components/layout';
import { FileTreeContextProvider } from './fileTreeContext';
import { toast } from '@/lib/toast';
import { useEditorFilesStore } from '@/stores/editorFilesStore';

function useElementSize<T extends HTMLElement>(): {
  ref: RefObject<T>;
  size: { width: number; height: number };
} {
  const elementRef = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return { ref: elementRef, size };
}

/**
 * 文件树面板组件
 */
export function FileTreePanel() {
  const treeRef = useRef<TreeApi<FileNodeType> | null>(null);
  const { data, isLoading, error, isConnected, refresh, createFile, renameFile, deleteFile, moveFiles } = useFileTree();
  const { ref: viewportRef, size } = useElementSize<HTMLDivElement>();
  const { openEditorTab } = useLayoutApi();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogName, setCreateDialogName] = useState('');
  const createDialogInputRef = useRef<HTMLInputElement | null>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    node: FileNodeType;
    position: { x: number; y: number };
  } | null>(null);

  const openCreateDialog = useCallback(() => {
    setCreateDialogName('');
    setCreateDialogOpen(true);
  }, []);

  const handleCreateFile = useCallback(async () => {
    const name = createDialogName.trim();
    if (!name) {
      toast.error('文件名不能为空');
      return;
    }

    try {
      const created = await createFile(name);
      openEditorTab(created.path);
      toast.success('已创建文件');
      setCreateDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建文件失败';
      toast.error(message);
    }
  }, [createDialogName, createFile, openEditorTab]);

  useEffect(() => {
    if (!createDialogOpen) return;
    const timeout = window.setTimeout(() => {
      createDialogInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [createDialogOpen]);

  const openContextMenu = useCallback((node: FileNodeType, position: { x: number; y: number }) => {
    setContextMenu({ node, position });
  }, []);

  const isFileOpen = useCallback((path: string): boolean => {
    const normalized = path.trim();
    if (!normalized) return false;
    return Boolean(useEditorFilesStore.getState().byPath[normalized]);
  }, []);

  /**
   * 处理菜单操作
   */
  const handleMenuAction = useCallback(
    async (action: FileOperation, node: FileNodeType) => {
      try {
        switch (action) {
          case 'create-file': {
            openCreateDialog();
            break;
          }
          case 'rename': {
            if (node.isFolder) return;
            if (isFileOpen(node.path)) {
              toast.error('该文件正在编辑中，请先关闭标签页再重命名');
              return;
            }
            const treeNode = treeRef.current?.get(node.id);
            treeNode?.edit();
            break;
          }
          case 'delete': {
            if (node.isFolder) return;
            if (isFileOpen(node.path)) {
              toast.error('该文件正在编辑中，请先关闭标签页再删除');
              return;
            }
            // Basic confirm to avoid accidental delete.
            const ok = window.confirm(`删除文件 ${node.name}？`);
            if (!ok) return;
            await deleteFile(node.path);
            break;
          }
          case 'copy-path': {
            await navigator.clipboard.writeText(node.path);
            break;
          }
          case 'create-folder':
          case 'reveal-in-finder': {
            // Not supported in the current backend contract.
            break;
          }
        }
      } catch (err) {
        console.error('[FileTree] Action failed:', action, err);
        toast.error('操作失败，请重试');
      }
    },
    [deleteFile, isFileOpen, openCreateDialog],
  );

  /**
   * 处理重命名提交
   */
  const handleRename = useCallback(
    async ({ id, name }: { id: string; name: string }) => {
      const node = treeRef.current?.get(id)?.data;
      if (!node || node.isFolder) return;
      try {
        await renameFile(node.path, name);
      } catch (error) {
        const message = error instanceof Error ? error.message : '重命名失败';
        toast.error(message);
        throw error;
      }
    },
    [renameFile],
  );

  /**
   * 处理选择
   */
  const handleSelect = useCallback((nodes: TreeApi<FileNodeType>['selectedNodes']) => {
    if (nodes.length > 0 && !nodes[0].data.isFolder) {
      // Phase 2 will wire this to editor tabs.
      console.log('[FileTree] Selected file:', nodes[0].data.path);
    }
  }, []);

  const handleActivate = useCallback(
    (node: NodeApi<FileNodeType>) => {
      if (!node.data.isFolder) {
        openEditorTab(node.data.path);
      }
    },
    [openEditorTab],
  );

  const treeWidth = Math.max(0, Math.floor(size.width));
  const treeHeight = Math.max(0, Math.floor(size.height));

  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)]" data-testid="layout-file-tree-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">资源管理器</span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="新建文件"
            type="button"
            onClick={openCreateDialog}
            disabled={!isConnected || isLoading}
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>

          <button
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="刷新"
            type="button"
            onClick={() => void refresh()}
            disabled={!isConnected || isLoading}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div
        className="flex-1 overflow-hidden"
        ref={viewportRef}
        onKeyDownCapture={(event) => {
          if (event.key !== 'F2') return;
          event.preventDefault();

          const focused = treeRef.current?.focusedNode;
          if (!focused || focused.data.isFolder) return;

          if (isFileOpen(focused.data.path)) {
            toast.error('该文件正在编辑中，请先关闭标签页再重命名');
            return;
          }

          focused.edit();
        }}
      >
        {!isConnected ? (
          <div className="p-4 text-center">
            <p className="text-sm text-[var(--text-muted)]">未连接到后端</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button className="mt-2 text-xs text-[var(--accent)] hover:underline" type="button" onClick={() => void refresh()}>
              重试
            </button>
          </div>
        ) : treeHeight <= 0 || treeWidth <= 0 ? null : (
          <FileTreeContextProvider value={{ openContextMenu }}>
            <Tree
              ref={(api) => {
                treeRef.current = api ?? null;
              }}
              data={data}
              openByDefault={true}
              width={treeWidth}
              height={treeHeight}
              indent={16}
              rowHeight={26}
              overscanCount={8}
              onSelect={handleSelect}
              onRename={handleRename}
              onActivate={handleActivate}
              onMove={(args) => {
                if (args.parentId !== 'documents') return;
                moveFiles(args.dragIds, args.index);
              }}
              className="file-tree"
            >
              {FileNodeRenderer}
            </Tree>
          </FileTreeContextProvider>
        )}
      </div>

      {/* Right Click Menu */}
      {contextMenu && (
        <FileContextMenu
          node={contextMenu.node}
          position={contextMenu.position}
          onAction={handleMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setCreateDialogName('');
        }}
      >
        <DialogContent className="max-w-md" data-testid="file-create-dialog">
          <DialogHeader>
            <DialogTitle>新建文件</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-xs text-[var(--text-muted)]">输入文件名（自动补全 .md）</div>
            <Input
              ref={createDialogInputRef}
              value={createDialogName}
              placeholder="未命名.md"
              data-testid="file-create-input"
              onChange={(e) => setCreateDialogName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                void handleCreateFile();
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" data-testid="file-create-confirm" onClick={() => void handleCreateFile()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileTreePanel;
