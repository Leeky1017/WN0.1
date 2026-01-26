/**
 * MaterialsView - 素材库视图
 * Why: 管理创作素材（图片、文档、链接）
 */

import { Image, FileText, Link, Plus } from 'lucide-react';

interface Material {
  id: number;
  type: 'image' | 'doc' | 'link';
  name: string;
  size?: string;
  url?: string;
  date: string;
}

export function MaterialsView() {
  const materials: Material[] = [
    { id: 1, type: 'image', name: '产品截图.png', size: '2.3 MB', date: '今天' },
    { id: 2, type: 'image', name: '数据图表.jpg', size: '1.8 MB', date: '昨天' },
    { id: 3, type: 'doc', name: '引用资料.pdf', size: '856 KB', date: '2天前' },
    {
      id: 4,
      type: 'link',
      name: '参考链接',
      url: 'https://example.com',
      date: '3天前',
    },
  ];

  return (
    <>
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          素材库
        </span>
        <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-subtle)] transition-colors duration-[100ms]">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <div className="grid grid-cols-2 gap-2">
          {materials.map((material) => (
            <button
              key={material.id}
              className="flex flex-col items-start p-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] rounded-md border border-[var(--border-subtle)] transition-colors duration-[100ms] text-left"
            >
              <div className="w-full aspect-video bg-[var(--bg-elevated)] rounded-md mb-2 flex items-center justify-center">
                {material.type === 'image' && (
                  <Image className="w-6 h-6 text-[var(--fg-subtle)]" />
                )}
                {material.type === 'doc' && (
                  <FileText className="w-6 h-6 text-[var(--fg-subtle)]" />
                )}
                {material.type === 'link' && (
                  <Link className="w-6 h-6 text-[var(--fg-subtle)]" />
                )}
              </div>
              <div className="w-full">
                <div className="text-[11px] text-[var(--fg-default)] truncate mb-0.5">
                  {material.name}
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-[var(--fg-subtle)]">
                    {material.type === 'link' ? 'Link' : material.size}
                  </span>
                  <span className="text-[10px] text-[var(--fg-subtle)]">
                    {material.date}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default MaterialsView;
