/**
 * 文件树类型定义
 */

/**
 * 文件节点类型
 */
export interface FileNode {
  id: string;
  name: string;
  isFolder: boolean;
  path: string;
  children?: FileNode[];
  /** 文件扩展名（仅文件有效） */
  extension?: string;
  /** 最后修改时间 */
  modifiedAt?: number;
}

/**
 * 文件操作类型
 */
export type FileOperation = 
  | 'create-file'
  | 'create-folder'
  | 'rename'
  | 'delete'
  | 'copy-path'
  | 'reveal-in-finder';

/**
 * 右键菜单项
 */
export interface ContextMenuItem {
  id: FileOperation | 'separator';
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
}
