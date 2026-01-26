import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Plus, MoreHorizontal } from 'lucide-react';

interface FilesViewProps {
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export function FilesView({ selectedFile, onSelectFile }: FilesViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['创作项目']));

  const fileTree: FileNode[] = [
    {
      name: '创作项目',
      type: 'folder',
      children: [
        { name: '欢迎使用.md', type: 'file' },
        { name: '今日想法.md', type: 'file' },
        { name: '文章草稿.md', type: 'file' },
      ],
    },
    {
      name: '产品文档',
      type: 'folder',
      children: [
        { name: '产品文档.docx', type: 'file' },
        { name: '产品介绍.md', type: 'file' },
        { name: '用户手册.docx', type: 'file' },
      ],
    },
    {
      name: '技术写作',
      type: 'folder',
      children: [
        { name: '技术规范.md', type: 'file' },
        { name: '技术分享.md', type: 'file' },
      ],
    },
    {
      name: '生活随笔',
      type: 'folder',
      children: [
        { name: '生活随笔.md', type: 'file' },
      ],
    },
  ];

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.name);
    const isSelected = selectedFile === node.name;
    const paddingLeft = depth * 12 + 8;

    if (node.type === 'folder') {
      return (
        <div key={node.name}>
          <button
            onClick={() => toggleFolder(node.name)}
            className="w-full flex items-center gap-1 py-1 hover:bg-[var(--bg-hover)] transition-colors text-[13px] text-[var(--text-secondary)]"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <button
          key={node.name}
          onClick={() => onSelectFile(node.name)}
          className={`w-full flex items-center gap-1 py-1 hover:bg-[var(--bg-hover)] transition-colors text-[13px] ${
            isSelected ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
          }`}
          style={{ paddingLeft: `${paddingLeft + 4}px` }}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      );
    }
  };

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">文件浏览器</span>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors" title="新建文件">
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors">
            <MoreHorizontal className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.map((node) => renderNode(node))}
      </div>
    </>
  );
}
