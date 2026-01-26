/**
 * OutlineView - 文档大纲视图
 * Why: 显示当前文档的标题结构，支持点击跳转到对应位置
 */

import { useMemo, useCallback } from 'react';
import { Hash, ChevronRight, FileText } from 'lucide-react';
import { useEditorRuntimeStore } from '@/stores';

interface OutlineViewProps {
  editorContent: string;
  selectedFile: string | null;
}

interface HeadingNode {
  level: number;
  text: string;
  id: string;
  line: number;
  /** 标题在原文中的字符位置（用于编辑器跳转） */
  charOffset: number;
}

export function OutlineView({ editorContent, selectedFile }: OutlineViewProps) {
  const activeEditor = useEditorRuntimeStore((s) => s.activeEditor);

  const headings = useMemo(() => {
    if (!editorContent) return [];

    const lines = editorContent.split('\n');
    const result: HeadingNode[] = [];
    let charOffset = 0;

    lines.forEach((line, index) => {
      // Markdown headings
      const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (mdMatch) {
        result.push({
          level: mdMatch[1].length,
          text: mdMatch[2],
          id: `heading-${index}`,
          line: index + 1,
          charOffset,
        });
      } else {
        // HTML headings
        const htmlMatch = line.match(/<h([1-6])>(.+?)<\/h[1-6]>/i);
        if (htmlMatch) {
          result.push({
            level: parseInt(htmlMatch[1]),
            text: htmlMatch[2].replace(/<[^>]*>/g, ''),
            id: `heading-${index}`,
            line: index + 1,
            charOffset,
          });
        }
      }
      
      // 累加字符位置（+1 是换行符）
      charOffset += line.length + 1;
    });

    return result;
  }, [editorContent]);

  // 点击标题跳转到编辑器对应位置
  const handleHeadingClick = useCallback((heading: HeadingNode) => {
    if (!activeEditor) {
      console.warn('[OutlineView] No active editor to scroll to');
      return;
    }
    
    try {
      // TipTap 编辑器：使用 setTextSelection 定位到指定位置
      // 位置需要转换为 ProseMirror 的位置（通常 +1 因为文档开头有隐藏节点）
      const pos = heading.charOffset + 1;
      
      // 尝试多种方法实现跳转
      if (typeof activeEditor.commands?.setTextSelection === 'function') {
        activeEditor.commands.setTextSelection(pos);
        activeEditor.commands.scrollIntoView();
      } else if (typeof activeEditor.commands?.focus === 'function') {
        // 备用：直接 focus 并尝试 scrollIntoView
        activeEditor.commands.focus(pos);
      }
      
      // 确保编辑器获得焦点
      if (typeof activeEditor.commands?.focus === 'function') {
        activeEditor.commands.focus();
      }
    } catch (err) {
      console.error('[OutlineView] Failed to scroll to heading:', err);
    }
  }, [activeEditor]);

  const getWordCount = () => {
    return editorContent.replace(/\s+/g, '').length;
  };

  if (!selectedFile) {
    return (
      <>
        <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
          <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">
            文档大纲
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <FileText className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
            <div className="text-[13px] text-[var(--text-tertiary)] mb-1">
              未打开文件
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              打开文件后查看大纲
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">
          文档大纲
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Document Stats */}
        <div className="p-3 border-b border-[var(--border-default)]">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-2">
            文档统计
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">字数</span>
            <span
              data-testid="outline-word-count"
              className="text-[var(--text-primary)] font-medium"
            >
              {getWordCount()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px] mt-1">
            <span className="text-[var(--text-secondary)]">标题</span>
            <span
              data-testid="outline-heading-count"
              className="text-[var(--text-primary)] font-medium"
            >
              {headings.length}
            </span>
          </div>
        </div>

        {/* Headings */}
        <div className="py-2" data-testid="outline-list">
          {headings.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="text-[13px] text-[var(--text-tertiary)] mb-1">
                暂无标题
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                使用 # 或 H1-H6 标签创建标题
              </div>
            </div>
          ) : (
            headings.map((heading) => (
              <button
                key={heading.id}
                data-testid={`outline-heading-${heading.line}`}
                onClick={() => handleHeadingClick(heading)}
                className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors text-left group"
                style={{ paddingLeft: `${8 + (heading.level - 1) * 12}px` }}
              >
                <Hash className="w-3.5 h-3.5 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                    {heading.text}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    第 {heading.line} 行
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

export default OutlineView;
