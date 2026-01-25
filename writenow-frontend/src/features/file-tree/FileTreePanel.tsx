/**
 * FileTreePanel - 文件树面板
 * 使用 react-arborist 实现高性能虚拟化文件树
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Tree, type NodeApi, type TreeApi } from 'react-arborist';
import { FilePlus, Loader2, RefreshCw } from 'lucide-react';

import { useFileTree } from './useFileTree';
import { FileNode as FileNodeRenderer } from './FileNode';
import { FileContextMenu } from './FileContextMenu';
import type { FileNode as FileNodeType, FileOperation } from './types';
import { useLayoutApi } from '@/components/layout';

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
  const { data, isLoading, error, isConnected, refresh, createFile, renameFile, deleteFile } = useFileTree();
  const { ref: viewportRef, size } = useElementSize<HTMLDivElement>();
  const { openEditorTab } = useLayoutApi();

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    node: FileNodeType;
    position: { x: number; y: number };
  } | null>(null);

  const handleCreateFile = useCallback(async () => {
    const name = window.prompt('新建文件名（.md）', '未命名.md');
    if (!name) return;

    try {
      const created = await createFile(name);
      openEditorTab(created.path);
    } catch (err) {
      console.error('[FileTree] Create file failed:', err);
    }
  }, [createFile, openEditorTab]);

  /**
   * 处理右键菜单（基于当前选中节点）
   */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const selectedNodes = treeRef.current?.selectedNodes;
      if (!selectedNodes || selectedNodes.length === 0) return;

      setContextMenu({
        node: selectedNodes[0].data,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [],
  );

  /**
   * 处理菜单操作
   */
  const handleMenuAction = useCallback(
    async (action: FileOperation, node: FileNodeType) => {
      try {
        switch (action) {
          case 'create-file': {
            await handleCreateFile();
            break;
          }
          case 'rename': {
            if (node.isFolder) return;
            const treeNode = treeRef.current?.get(node.id);
            treeNode?.edit();
            break;
          }
          case 'delete': {
            if (node.isFolder) return;
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
      }
    },
    [deleteFile, handleCreateFile],
  );

  /**
   * 处理重命名提交
   */
  const handleRename = useCallback(
    async ({ id, name }: { id: string; name: string }) => {
      const node = treeRef.current?.get(id)?.data;
      if (!node || node.isFolder) return;
      await renameFile(node.path, name);
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

  useEffect(() => {
    if (isConnected) {
      void refresh();
    }
  }, [isConnected, refresh]);

  const treeWidth = Math.max(0, Math.floor(size.width));
  const treeHeight = Math.max(0, Math.floor(size.height));

  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">资源管理器</span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="新建文件"
            type="button"
            onClick={handleCreateFile}
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
      <div className="flex-1 overflow-hidden" ref={viewportRef}>
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
            onRename={(args) => void handleRename(args)}
            onActivate={handleActivate}
            onContextMenu={handleContextMenu}
            className="file-tree"
          >
            {FileNodeRenderer}
          </Tree>
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
    </div>
  );
}

export default FileTreePanel;
