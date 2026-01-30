/**
 * FileTree Component
 * 
 * 文件树组件，递归渲染文件/文件夹结构，预留拖拽排序。
 * 
 * @see DESIGN_SPEC.md 4.3 Sidebar Content
 * @see DESIGN_SPEC.md 8.1.6 文件管理流程
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { FileTreeItem } from './FileTreeItem';
import { useFileStore, type FileNode } from '../../../stores/fileStore';

export interface FileTreeProps {
  /** 自定义类名 */
  className?: string;
  /** 空状态时的占位内容 */
  emptyState?: ReactNode;
  /** 选中文件时的回调 */
  onFileSelect?: (node: FileNode) => void;
  /** 打开文件时的回调（双击） */
  onFileOpen?: (node: FileNode) => void;
}

/**
 * 递归渲染文件树节点
 */
function renderTreeNodes(
  nodes: FileNode[],
  level: number,
  props: {
    selectedNodeId: string | null;
    expandedIds: Set<string>;
    onSelect: (node: FileNode) => void;
    onOpen: (node: FileNode) => void;
    onToggleExpand: (node: FileNode) => void;
    onRename: (node: FileNode, newName: string) => void;
    onDelete: (node: FileNode) => void;
    onNewFile: (parentNode: FileNode) => void;
    onNewFolder: (parentNode: FileNode) => void;
    onStartRename: (node: FileNode) => void;
    onCancelRename: (node: FileNode) => void;
  }
): ReactNode {
  // 排序：文件夹在前，文件在后，同类型按名称排序
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return sortedNodes.map((node) => {
    const isExpanded = props.expandedIds.has(node.id);
    
    return (
      <div key={node.id} role="group">
        <FileTreeItem
          node={node}
          level={level}
          isSelected={props.selectedNodeId === node.id}
          isExpanded={isExpanded}
          onClick={props.onSelect}
          onDoubleClick={props.onOpen}
          onToggleExpand={props.onToggleExpand}
          onRename={props.onRename}
          onDelete={props.onDelete}
          onNewFile={props.onNewFile}
          onNewFolder={props.onNewFolder}
          onStartRename={props.onStartRename}
          onCancelRename={props.onCancelRename}
        />
        
        {/* 子节点（仅展开的文件夹） */}
        {node.type === 'folder' && isExpanded && node.children && node.children.length > 0 && (
          <div
            className={clsx(
              'overflow-hidden',
              'transition-all duration-[var(--duration-normal)]',
            )}
          >
            {renderTreeNodes(node.children, level + 1, props)}
          </div>
        )}
      </div>
    );
  });
}

/**
 * 文件树组件
 * 
 * 使用 fileStore 管理状态，递归渲染文件/文件夹结构。
 * 
 * @example
 * ```tsx
 * <FileTree
 *   onFileSelect={(node) => console.log('Selected:', node)}
 *   onFileOpen={(node) => router.navigate(`/editor/${node.id}`)}
 * />
 * ```
 */
export function FileTree({
  className,
  emptyState,
  onFileSelect,
  onFileOpen,
}: FileTreeProps) {
  const {
    nodes,
    selectedNodeId,
    expandedIds,
    isLoading,
    selectNode,
    toggleExpanded,
    renameNode,
    deleteNode,
    createFile,
    createFolder,
    startRenaming,
    cancelRenaming,
  } = useFileStore();

  /**
   * 处理节点选中
   */
  const handleSelect = (node: FileNode) => {
    selectNode(node.id);
    onFileSelect?.(node);
  };

  /**
   * 处理文件打开
   */
  const handleOpen = (node: FileNode) => {
    if (node.type === 'file') {
      onFileOpen?.(node);
    } else {
      // 文件夹双击切换展开
      toggleExpanded(node.id);
    }
  };

  /**
   * 处理展开/折叠
   */
  const handleToggleExpand = (node: FileNode) => {
    toggleExpanded(node.id);
  };

  /**
   * 处理重命名
   */
  const handleRename = (node: FileNode, newName: string) => {
    renameNode(node.id, newName);
  };

  /**
   * 处理删除
   */
  const handleDelete = (node: FileNode) => {
    // TODO: 显示确认对话框
    deleteNode(node.id);
  };

  /**
   * 处理新建文件
   */
  const handleNewFile = async (parentNode: FileNode) => {
    const newFile = await createFile('Untitled', parentNode.id);
    // 自动开始重命名
    startRenaming(newFile.id);
  };

  /**
   * 处理新建文件夹
   */
  const handleNewFolder = async (parentNode: FileNode) => {
    const newFolder = await createFolder('New Folder', parentNode.id);
    // 自动开始重命名
    startRenaming(newFolder.id);
  };

  /**
   * 处理开始重命名
   */
  const handleStartRename = (node: FileNode) => {
    startRenaming(node.id);
  };

  /**
   * 处理取消重命名
   */
  const handleCancelRename = (node: FileNode) => {
    cancelRenaming(node.id);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className={clsx('space-y-1', className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={clsx(
              'h-8 rounded',
              'bg-[var(--color-bg-hover)]',
              'animate-pulse',
            )}
            style={{ marginLeft: i % 2 === 0 ? 16 : 0 }}
          />
        ))}
      </div>
    );
  }

  // 空状态
  if (nodes.length === 0) {
    return (
      <div className={clsx('py-8', className)}>
        {emptyState || (
          <div className="text-center text-[13px] text-[var(--color-text-tertiary)]">
            No files yet
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label="File tree"
      className={clsx('select-none', className)}
    >
      {renderTreeNodes(nodes, 0, {
        selectedNodeId,
        expandedIds,
        onSelect: handleSelect,
        onOpen: handleOpen,
        onToggleExpand: handleToggleExpand,
        onRename: handleRename,
        onDelete: handleDelete,
        onNewFile: handleNewFile,
        onNewFolder: handleNewFolder,
        onStartRename: handleStartRename,
        onCancelRename: handleCancelRename,
      })}
    </div>
  );
}

FileTree.displayName = 'FileTree';
