/**
 * FileIcon - 文件图标组件
 * 根据文件类型显示对应图标
 */
import {
  FileText,
  FileCode,
  FileJson,
  File,
  Folder,
  FolderOpen,
  FileType,
  Hash,
  Settings,
  BookOpen,
  FileImage,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * 文件扩展名到图标的映射
 */
const extensionIcons: Record<string, LucideIcon> = {
  // Markdown
  '.md': FileText,
  '.mdx': FileText,
  '.markdown': FileText,
  
  // Code
  '.ts': FileCode,
  '.tsx': FileCode,
  '.js': FileCode,
  '.jsx': FileCode,
  '.py': FileCode,
  '.rs': FileCode,
  '.go': FileCode,
  '.java': FileCode,
  '.c': FileCode,
  '.cpp': FileCode,
  '.h': FileCode,
  
  // Data
  '.json': FileJson,
  '.yaml': Settings,
  '.yml': Settings,
  '.toml': Settings,
  '.xml': FileCode,
  
  // Text
  '.txt': FileType,
  '.log': FileType,
  '.csv': Hash,
  
  // Images
  '.png': FileImage,
  '.jpg': FileImage,
  '.jpeg': FileImage,
  '.gif': FileImage,
  '.svg': FileImage,
  '.webp': FileImage,
  
  // Docs
  '.pdf': BookOpen,
  '.doc': BookOpen,
  '.docx': BookOpen,
};

/**
 * 特殊文件名到图标的映射
 */
const specialFileIcons: Record<string, LucideIcon> = {
  'readme.md': BookOpen,
  'readme': BookOpen,
  'package.json': FileJson,
  'tsconfig.json': Settings,
  '.gitignore': Settings,
  '.env': Settings,
};

interface FileIconProps {
  name: string;
  isFolder: boolean;
  isOpen?: boolean;
  className?: string;
}

/**
 * 文件图标组件
 */
export function FileIcon({ name, isFolder, isOpen = false, className = '' }: FileIconProps) {
  const baseClassName = `w-4 h-4 flex-shrink-0 ${className}`;
  
  // 文件夹图标
  if (isFolder) {
    const Icon = isOpen ? FolderOpen : Folder;
    return <Icon className={`${baseClassName} text-[var(--accent)]`} />;
  }
  
  // 特殊文件名
  const lowerName = name.toLowerCase();
  const SpecialIcon = specialFileIcons[lowerName];
  if (SpecialIcon) {
    return <SpecialIcon className={`${baseClassName} text-[var(--text-muted)]`} />;
  }
  
  // 根据扩展名
  const ext = lowerName.slice(lowerName.lastIndexOf('.'));
  const ExtIcon = extensionIcons[ext];
  if (ExtIcon) {
    return <ExtIcon className={`${baseClassName} text-[var(--text-muted)]`} />;
  }
  
  // 默认文件图标
  return <File className={`${baseClassName} text-[var(--text-muted)]`} />;
}

export default FileIcon;
