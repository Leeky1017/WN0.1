/**
 * FileContextMenu - 文件右键菜单
 */
import { useCallback } from 'react';
import {
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  FolderOpen,
} from 'lucide-react';
import type { FileNode, FileOperation } from './types';

interface FileContextMenuProps {
  node: FileNode;
  position: { x: number; y: number };
  onAction: (action: FileOperation, node: FileNode) => void;
  onClose: () => void;
}

/**
 * 菜单项组件
 */
function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`
        flex items-center gap-3 w-full px-3 py-1.5 text-left text-sm rounded
        ${danger 
          ? 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }
        transition-colors
      `}
      onClick={onClick}
    >
      <span className="w-4 h-4 flex items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-[var(--text-muted)]">{shortcut}</span>
      )}
    </button>
  );
}

/**
 * 分隔线
 */
function Separator() {
  return <div className="h-px bg-[var(--border-subtle)] my-1" />;
}

/**
 * 文件右键菜单组件
 */
export function FileContextMenu({
  node,
  position,
  onAction,
  onClose,
}: FileContextMenuProps) {
  const handleAction = useCallback((action: FileOperation) => {
    onAction(action, node);
    onClose();
  }, [node, onAction, onClose]);

  // 关闭菜单的点击处理
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={handleBackdropClick}
        onContextMenu={handleBackdropClick}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[180px] py-1 bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-lg shadow-xl"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {node.isFolder && (
          <>
            <MenuItem
              icon={<FilePlus className="w-4 h-4" />}
              label="新建文件"
              onClick={() => handleAction('create-file')}
            />
            <MenuItem
              icon={<FolderPlus className="w-4 h-4" />}
              label="新建文件夹"
              onClick={() => handleAction('create-folder')}
            />
            <Separator />
          </>
        )}
        
        <MenuItem
          icon={<Pencil className="w-4 h-4" />}
          label="重命名"
          shortcut="F2"
          onClick={() => handleAction('rename')}
        />
        
        <MenuItem
          icon={<Copy className="w-4 h-4" />}
          label="复制路径"
          onClick={() => handleAction('copy-path')}
        />
        
        <MenuItem
          icon={<FolderOpen className="w-4 h-4" />}
          label="在访达中显示"
          onClick={() => handleAction('reveal-in-finder')}
        />
        
        <Separator />
        
        <MenuItem
          icon={<Trash2 className="w-4 h-4" />}
          label="删除"
          danger
          onClick={() => handleAction('delete')}
        />
      </div>
    </>
  );
}

export default FileContextMenu;
