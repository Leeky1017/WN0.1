import React from 'react';
import { Image, FileText, Link, Plus } from 'lucide-react';

export function MaterialsView() {
  const materials = [
    { id: 1, type: 'image', name: '产品截图.png', size: '2.3 MB', date: '今天' },
    { id: 2, type: 'image', name: '数据图表.jpg', size: '1.8 MB', date: '昨天' },
    { id: 3, type: 'doc', name: '引用资料.pdf', size: '856 KB', date: '2天前' },
    { id: 4, type: 'link', name: '参考链接', url: 'https://example.com', date: '3天前' },
  ];

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">素材库</span>
        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {materials.map((material) => (
            <button
              key={material.id}
              className="flex flex-col items-start p-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded border border-[var(--border-default)] transition-colors text-left"
            >
              <div className="w-full aspect-video bg-[var(--bg-tertiary)] rounded mb-2 flex items-center justify-center">
                {material.type === 'image' && <Image className="w-6 h-6 text-[var(--text-tertiary)]" />}
                {material.type === 'doc' && <FileText className="w-6 h-6 text-[var(--text-tertiary)]" />}
                {material.type === 'link' && <Link className="w-6 h-6 text-[var(--text-tertiary)]" />}
              </div>
              <div className="w-full">
                <div className="text-[11px] text-[var(--text-primary)] truncate mb-0.5">{material.name}</div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {material.type === 'link' ? 'Link' : material.size}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{material.date}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
