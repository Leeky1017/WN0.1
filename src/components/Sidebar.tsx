import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  FolderOpen,
  Search,
  Plus,
  MoreHorizontal
} from 'lucide-react';

interface SidebarProps {
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
}

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
}

export function Sidebar({ selectedFile, onSelectFile }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['我的创作']));

  const files: FileItem[] = [
    {
      name: '我的创作',
      type: 'folder',
      children: [
        { name: '欢迎使用.md', type: 'file' },
        { name: '今日想法.md', type: 'file' },
        { name: '文章草稿.md', type: 'file' },
      ]
    },
    {
      name: '项目文档',
      type: 'folder',
      children: [
        { name: '产品介绍.md', type: 'file' },
        { name: '用户手册.md', type: 'file' },
      ]
    },
    {
      name: '博客文章',
      type: 'folder',
      children: [
        { name: '技术分享.md', type: 'file' },
        { name: '生活随笔.md', type: 'file' },
      ]
    },
    { name: '归档', type: 'folder', children: [] },
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

  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.name);
      const isSelected = selectedFile === item.name;

      if (item.type === 'folder') {
        return (
          <div key={item.name}>
            <div
              className="flex items-center gap-1 px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px]"
              style={{ paddingLeft: `${8 + level * 16}px` }}
              onClick={() => toggleFolder(item.name)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 flex-shrink-0 text-[#dcb67a]" />
              ) : (
                <Folder className="w-4 h-4 flex-shrink-0 text-[#dcb67a]" />
              )}
              <span className="truncate">{item.name}</span>
            </div>
            {isExpanded && item.children && renderFileTree(item.children, level + 1)}
          </div>
        );
      } else {
        return (
          <div
            key={item.name}
            className={`flex items-center gap-1 px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer text-[13px] ${
              isSelected ? 'bg-[#37373d]' : ''
            }`}
            style={{ paddingLeft: `${24 + level * 16}px` }}
            onClick={() => onSelectFile(item.name)}
          >
            <FileText className="w-4 h-4 flex-shrink-0 text-[#519aba]" />
            <span className="truncate">{item.name}</span>
          </div>
        );
      }
    });
  };

  return (
    <div className="w-64 bg-[#252526] border-r border-[#2d2d30] flex flex-col">
      {/* Sidebar Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-[#2d2d30]">
        <span className="text-[11px] uppercase tracking-wider text-[#888888]">资源管理器</span>
        <div className="flex gap-1">
          <button className="hover:bg-[#2a2d2e] p-1 rounded">
            <Plus className="w-4 h-4" />
          </button>
          <button className="hover:bg-[#2a2d2e] p-1 rounded">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 bg-[#3c3c3c] rounded px-2 py-1">
          <Search className="w-3.5 h-3.5 text-[#888888]" />
          <input
            type="text"
            placeholder="搜索文件..."
            className="bg-transparent outline-none text-[13px] flex-1 text-[#cccccc] placeholder-[#888888]"
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {renderFileTree(files)}
      </div>
    </div>
  );
}
