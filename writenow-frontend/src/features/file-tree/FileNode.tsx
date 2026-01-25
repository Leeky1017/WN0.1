/**
 * FileNode - 文件树节点渲染组件
 * 用于 react-arborist 的自定义节点渲染
 */
import type { CSSProperties } from 'react';
import type { NodeApi, TreeApi } from 'react-arborist';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FileIcon } from './FileIcon';
import type { FileNode as FileNodeType } from './types';

/**
 * react-arborist NodeRendererProps 类型定义
 */
interface FileNodeProps {
  style: CSSProperties;
  node: NodeApi<FileNodeType>;
  tree: TreeApi<FileNodeType>;
  dragHandle?: (el: HTMLDivElement | null) => void;
  preview?: boolean;
}

/**
 * 文件树节点组件
 */
export function FileNode({ node, style, dragHandle }: FileNodeProps) {
  const data = node.data;
  const isFolder = data.isFolder;
  const isOpen = node.isOpen;
  const isSelected = node.isSelected;
  const isEditing = node.isEditing;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`
        flex items-center gap-1 px-2 py-0.5 cursor-pointer select-none
        ${isSelected 
          ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        }
        rounded transition-colors
      `}
      onClick={() => {
        if (isFolder) {
          node.toggle();
        } else {
          node.select();
        }
      }}
      onDoubleClick={() => {
        if (!isFolder) {
          // TODO: 打开文件编辑
          console.log('[FileTree] Open file:', data.path);
        }
      }}
    >
      {/* 展开/折叠图标 */}
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {isFolder && (
          isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )
        )}
      </span>

      {/* 文件/文件夹图标 */}
      <FileIcon 
        name={data.name} 
        isFolder={isFolder} 
        isOpen={isOpen} 
      />

      {/* 文件名 */}
      {isEditing ? (
        <input
          type="text"
          autoFocus
          defaultValue={data.name}
          className="flex-1 px-1 py-0 text-sm bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--accent)] rounded outline-none"
          onBlur={(e) => {
            node.submit(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              node.submit(e.currentTarget.value);
            } else if (e.key === 'Escape') {
              node.reset();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{data.name}</span>
      )}
    </div>
  );
}

export default FileNode;
