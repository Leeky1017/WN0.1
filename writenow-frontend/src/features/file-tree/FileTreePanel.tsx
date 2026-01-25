/**
 * FileTreePanel - 文件树面板
 * 使用 react-arborist 实现高性能虚拟化文件树
 */
import { useState, useCallback, useRef } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import { RefreshCw, FilePlus, FolderPlus, Loader2 } from 'lucide-react';
import { useFileTree } from './useFileTree';
import { FileNode } from './FileNode';
import { FileContextMenu } from './FileContextMenu';
import type { FileNode as FileNodeType, FileOperation } from './types';

// 示例数据（用于演示，实际使用后端数据）
const DEMO_DATA: FileNodeType[] = [
  {
    id: 'project',
    name: '我的项目',
    isFolder: true,
    path: '/',
    children: [
      {
        id: 'chapter1',
        name: '第一章.md',
        isFolder: false,
        path: '/第一章.md',
        extension: '.md',
      },
      {
        id: 'chapter2',
        name: '第二章.md',
        isFolder: false,
        path: '/第二章.md',
        extension: '.md',
      },
      {
        id: 'outline',
        name: '大纲.md',
        isFolder: false,
        path: '/大纲.md',
        extension: '.md',
      },
      {
        id: 'characters',
        name: '人物设定',
        isFolder: true,
        path: '/人物设定',
        children: [
          {
            id: 'protagonist',
            name: '主角.md',
            isFolder: false,
            path: '/人物设定/主角.md',
            extension: '.md',
          },
          {
            id: 'antagonist',
            name: '反派.md',
            isFolder: false,
            path: '/人物设定/反派.md',
            extension: '.md',
          },
        ],
      },
      {
        id: 'settings',
        name: '世界观',
        isFolder: true,
        path: '/世界观',
        children: [
          {
            id: 'magic-system',
            name: '魔法体系.md',
            isFolder: false,
            path: '/世界观/魔法体系.md',
            extension: '.md',
          },
        ],
      },
    ],
  },
];

/**
 * 文件树面板组件
 */
export function FileTreePanel() {
  const treeRef = useRef<TreeApi<FileNodeType>>(null);
  const { data, isLoading, error, isConnected, refresh } = useFileTree();
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    node: FileNodeType;
    position: { x: number; y: number };
  } | null>(null);

  // 使用后端数据或演示数据
  const treeData = data.length > 0 ? data : DEMO_DATA;

  /**
   * 处理右键菜单
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 获取当前选中的节点
    const selectedNodes = treeRef.current?.selectedNodes;
    if (selectedNodes && selectedNodes.length > 0) {
      setContextMenu({
        node: selectedNodes[0].data,
        position: { x: e.clientX, y: e.clientY },
      });
    }
  }, []);

  /**
   * 处理菜单操作
   */
  const handleMenuAction = useCallback((action: FileOperation, node: FileNodeType) => {
    console.log('[FileTree] Action:', action, 'on', node.path);
    
    switch (action) {
      case 'create-file':
        // TODO: 创建文件对话框
        break;
      case 'create-folder':
        // TODO: 创建文件夹对话框
        break;
      case 'rename':
        // 触发内联编辑
        const treeNode = treeRef.current?.get(node.id);
        if (treeNode) {
          treeNode.edit();
        }
        break;
      case 'delete':
        // TODO: 确认对话框
        break;
      case 'copy-path':
        navigator.clipboard.writeText(node.path);
        break;
      case 'reveal-in-finder':
        // TODO: 调用后端接口
        break;
    }
  }, []);

  /**
   * 处理重命名
   */
  const handleRename = useCallback(({ id, name }: { id: string; name: string }) => {
    console.log('[FileTree] Rename:', id, '->', name);
    // TODO: 调用后端重命名接口
  }, []);

  /**
   * 处理选择
   */
  const handleSelect = useCallback((nodes: TreeApi<FileNodeType>['selectedNodes']) => {
    if (nodes.length > 0 && !nodes[0].data.isFolder) {
      console.log('[FileTree] Selected file:', nodes[0].data.path);
      // TODO: 在编辑器中打开文件
    }
  }, []);

  return (
    <div 
      className="h-full flex flex-col bg-[var(--bg-sidebar)]"
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          资源管理器
        </span>
        <div className="flex items-center gap-1">
          <button 
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="新建文件"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="新建文件夹"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button 
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="刷新"
            onClick={refresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      
      {/* Tree Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button 
              className="mt-2 text-xs text-[var(--accent)] hover:underline"
              onClick={refresh}
            >
              重试
            </button>
          </div>
        ) : (
          <Tree
            ref={treeRef}
            data={treeData}
            openByDefault={true}
            width="100%"
            height={1000}
            indent={16}
            rowHeight={26}
            overscanCount={5}
            onSelect={handleSelect}
            onRename={handleRename}
            className="file-tree"
          >
            {FileNode}
          </Tree>
        )}
      </div>

      {/* 连接状态提示 */}
      {!isConnected && data.length === 0 && (
        <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            演示数据（连接后端查看实际文件）
          </p>
        </div>
      )}

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
