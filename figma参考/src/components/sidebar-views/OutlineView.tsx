import React, { useMemo } from 'react';
import { Hash, ChevronRight } from 'lucide-react';

interface OutlineViewProps {
  editorContent: string;
  selectedFile: string | null;
}

interface HeadingNode {
  level: number;
  text: string;
  id: string;
  line: number;
}

export function OutlineView({ editorContent, selectedFile }: OutlineViewProps) {
  const headings = useMemo(() => {
    if (!editorContent) return [];

    const lines = editorContent.split('\n');
    const result: HeadingNode[] = [];

    lines.forEach((line, index) => {
      // Markdown headings
      const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (mdMatch) {
        result.push({
          level: mdMatch[1].length,
          text: mdMatch[2],
          id: `heading-${index}`,
          line: index + 1,
        });
        return;
      }

      // HTML headings
      const htmlMatch = line.match(/<h([1-6])>(.+?)<\/h[1-6]>/i);
      if (htmlMatch) {
        result.push({
          level: parseInt(htmlMatch[1]),
          text: htmlMatch[2].replace(/<[^>]*>/g, ''),
          id: `heading-${index}`,
          line: index + 1,
        });
      }
    });

    return result;
  }, [editorContent]);

  const getWordCount = () => {
    return editorContent.replace(/\s+/g, '').length;
  };

  if (!selectedFile) {
    return (
      <>
        <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
          <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">文档大纲</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-[13px] text-[var(--text-tertiary)] mb-1">未打开文件</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">打开文件后查看大纲</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)} font-medium tracking-wide">文档大纲</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Document Stats */}
        <div className="p-3 border-b border-[var(--border-default)]">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-2">文档统计</div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">字数</span>
            <span className="text-[var(--text-primary)] font-medium">{getWordCount()}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] mt-1">
            <span className="text-[var(--text-secondary)]">标题</span>
            <span className="text-[var(--text-primary)] font-medium">{headings.length}</span>
          </div>
        </div>

        {/* Headings */}
        <div className="py-2">
          {headings.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="text-[13px] text-[var(--text-tertiary)] mb-1">暂无标题</div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                使用 # 或 H1-H6 标签创建标题
              </div>
            </div>
          ) : (
            headings.map((heading) => (
              <button
                key={heading.id}
                className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors text-left group"
                style={{ paddingLeft: `${8 + (heading.level - 1) * 12}px` }}
              >
                <Hash className="w-3.5 h-3.5 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                    {heading.text}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    Line {heading.line}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
