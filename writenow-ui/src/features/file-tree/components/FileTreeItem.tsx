/**
 * FileTreeItem Component
 * 
 * 文件树节点，支持文件/文件夹、展开/折叠、右键菜单。
 * 
 * @see DESIGN_SPEC.md 4.3 Sidebar Content 列表项规范
 * @see DESIGN_SPEC.md 8.1.6 文件管理流程
 */
import { useState, useRef, useEffect, type KeyboardEvent, type MouseEvent } from 'react';
import { clsx } from 'clsx';
import {
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import type { FileNode } from '../../../stores/fileStore';

export interface FileTreeItemProps {
  /** 节点数据 */
  node: FileNode;
  /** 嵌套层级 */
  level?: number;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否展开 */
  isExpanded?: boolean;
  /** 点击回调 */
  onClick?: (node: FileNode) => void;
  /** 双击回调（打开文件） */
  onDoubleClick?: (node: FileNode) => void;
  /** 展开/折叠回调 */
  onToggleExpand?: (node: FileNode) => void;
  /** 重命名回调 */
  onRename?: (node: FileNode, newName: string) => void;
  /** 删除回调 */
  onDelete?: (node: FileNode) => void;
  /** 新建文件回调 */
  onNewFile?: (parentNode: FileNode) => void;
  /** 新建文件夹回调 */
  onNewFolder?: (parentNode: FileNode) => void;
  /** 开始重命名回调 */
  onStartRename?: (node: FileNode) => void;
  /** 取消重命名回调 */
  onCancelRename?: (node: FileNode) => void;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 列表项 | 字号 | 13px |
 * | | 颜色(默认) | #888888 |
 * | | 颜色(hover) | #ffffff |
 * | | 颜色(active) | #ffffff |
 * | | 内边距 | 6px 8px |
 * | | 圆角 | 4px |
 * | | 背景(hover) | #1a1a1a |
 * | | 背景(active) | #222222 |
 * | 缩进 | 每层 | 16px |
 * | 图标 | 尺寸 | 14px |
 * | | 间距 | 8px |
 */
export function FileTreeItem({
  node,
  level = 0,
  isSelected = false,
  isExpanded = false,
  onClick,
  onDoubleClick,
  onToggleExpand,
  onRename,
  onDelete,
  onNewFile,
  onNewFolder,
  onStartRename,
  onCancelRename,
}: FileTreeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isFolder = node.type === 'folder';
  const paddingLeft = 8 + level * 16; // 基础 padding + 每层缩进
  
  // 当节点进入重命名状态时，自动聚焦输入框
  useEffect(() => {
    if (node.isRenaming) {
      setIsEditing(true);
      setEditValue(node.name);
    }
  }, [node.isRenaming, node.name]);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * 处理展开/折叠点击
   */
  const handleChevronClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onToggleExpand?.(node);
    }
  };

  /**
   * 处理项目点击
   */
  const handleClick = () => {
    if (!isEditing) {
      onClick?.(node);
    }
  };

  /**
   * 处理双击
   */
  const handleDoubleClick = () => {
    if (!isEditing) {
      onDoubleClick?.(node);
    }
  };

  /**
   * 处理重命名提交
   */
  const handleRenameSubmit = () => {
    if (editValue.trim() && editValue !== node.name) {
      onRename?.(node, editValue.trim());
    }
    setIsEditing(false);
    onCancelRename?.(node);
  };

  /**
   * 处理重命名取消
   */
  const handleRenameCancel = () => {
    setEditValue(node.name);
    setIsEditing(false);
    onCancelRename?.(node);
  };

  /**
   * 处理重命名输入框键盘事件
   */
  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  /**
   * 开始重命名
   */
  const handleStartRename = () => {
    setIsEditing(true);
    setEditValue(node.name);
    onStartRename?.(node);
  };

  /**
   * 渲染图标
   */
  const renderIcon = () => {
    const iconClass = 'w-3.5 h-3.5 shrink-0';
    
    if (isFolder) {
      return isExpanded ? (
        <FolderOpen className={iconClass} strokeWidth={1.5} />
      ) : (
        <Folder className={iconClass} strokeWidth={1.5} />
      );
    }
    
    return <File className={iconClass} strokeWidth={1.5} />;
  };

  const itemContent = (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isFolder ? isExpanded : undefined}
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={clsx(
        // 基础样式
        'group',
        'w-full',
        'flex items-center gap-2',
        'py-1.5',
        'rounded',
        'text-[13px] text-left',
        'cursor-pointer',
        'transition-colors duration-[var(--duration-fast)]',
        
        // 状态样式
        isSelected
          ? 'text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
          
        // 焦点样式
        'focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]',
      )}
      style={{ paddingLeft, paddingRight: 8 }}
    >
      {/* 展开/折叠箭头（仅文件夹） */}
      {isFolder ? (
        <button
          type="button"
          onClick={handleChevronClick}
          className={clsx(
            'w-4 h-4 shrink-0',
            'flex items-center justify-center',
            '-ml-1',
            'text-[var(--color-text-tertiary)]',
            'hover:text-[var(--color-text-primary)]',
            'transition-transform duration-[var(--duration-fast)]',
            isExpanded && 'rotate-90',
          )}
        >
          <ChevronRight className="w-3 h-3" strokeWidth={2} />
        </button>
      ) : (
        <span className="w-4 shrink-0 -ml-1" />
      )}

      {/* 文件/文件夹图标 */}
      {renderIcon()}

      {/* 名称 / 重命名输入框 */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameSubmit}
          className={clsx(
            'flex-1 min-w-0',
            'px-1 py-0',
            'bg-[var(--color-bg-surface)]',
            'border border-[var(--color-border-focus)]',
            'rounded',
            'text-[13px]',
            'text-[var(--color-text-primary)]',
            'outline-none',
          )}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate">{node.name}</span>
      )}

      {/* 字数统计（仅文件） */}
      {!isFolder && node.wordCount !== undefined && !isEditing && (
        <span className="text-[11px] text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
          {node.wordCount.toLocaleString()}
        </span>
      )}

      {/* 更多操作按钮 */}
      {!isEditing && (
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            'w-5 h-5 shrink-0',
            'flex items-center justify-center',
            'rounded',
            'text-[var(--color-text-tertiary)]',
            'opacity-0 group-hover:opacity-100',
            'hover:text-[var(--color-text-primary)]',
            'hover:bg-[var(--color-bg-active)]',
            'transition-all duration-[var(--duration-fast)]',
          )}
        >
          <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        {itemContent}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className={clsx(
            'min-w-[160px]',
            'p-1',
            'bg-[var(--color-bg-surface)]',
            'border border-[var(--color-border-default)]',
            'rounded-lg',
            'shadow-lg',
            'z-50',
            'animate-scale-in',
          )}
        >
          {/* 重命名 */}
          <ContextMenu.Item
            onSelect={handleStartRename}
            className={clsx(
              'flex items-center gap-2',
              'px-2 py-1.5',
              'rounded',
              'text-[13px] text-[var(--color-text-secondary)]',
              'cursor-pointer',
              'outline-none',
              'hover:bg-[var(--color-bg-hover)]',
              'hover:text-[var(--color-text-primary)]',
              'data-[highlighted]:bg-[var(--color-bg-hover)]',
              'data-[highlighted]:text-[var(--color-text-primary)]',
            )}
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            Rename
          </ContextMenu.Item>

          {/* 文件夹特有：新建文件/文件夹 */}
          {isFolder && (
            <>
              <ContextMenu.Separator className="h-px bg-[var(--color-border-default)] my-1" />
              
              <ContextMenu.Item
                onSelect={() => onNewFile?.(node)}
                className={clsx(
                  'flex items-center gap-2',
                  'px-2 py-1.5',
                  'rounded',
                  'text-[13px] text-[var(--color-text-secondary)]',
                  'cursor-pointer',
                  'outline-none',
                  'hover:bg-[var(--color-bg-hover)]',
                  'hover:text-[var(--color-text-primary)]',
                  'data-[highlighted]:bg-[var(--color-bg-hover)]',
                  'data-[highlighted]:text-[var(--color-text-primary)]',
                )}
              >
                <FilePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                New File
              </ContextMenu.Item>
              
              <ContextMenu.Item
                onSelect={() => onNewFolder?.(node)}
                className={clsx(
                  'flex items-center gap-2',
                  'px-2 py-1.5',
                  'rounded',
                  'text-[13px] text-[var(--color-text-secondary)]',
                  'cursor-pointer',
                  'outline-none',
                  'hover:bg-[var(--color-bg-hover)]',
                  'hover:text-[var(--color-text-primary)]',
                  'data-[highlighted]:bg-[var(--color-bg-hover)]',
                  'data-[highlighted]:text-[var(--color-text-primary)]',
                )}
              >
                <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                New Folder
              </ContextMenu.Item>
            </>
          )}

          <ContextMenu.Separator className="h-px bg-[var(--color-border-default)] my-1" />

          {/* 删除 */}
          <ContextMenu.Item
            onSelect={() => onDelete?.(node)}
            className={clsx(
              'flex items-center gap-2',
              'px-2 py-1.5',
              'rounded',
              'text-[13px] text-[var(--color-error)]',
              'cursor-pointer',
              'outline-none',
              'hover:bg-[var(--color-bg-hover)]',
              'data-[highlighted]:bg-[var(--color-bg-hover)]',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

FileTreeItem.displayName = 'FileTreeItem';
