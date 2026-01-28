/**
 * OutlinePanel
 * Why: Display and navigate document outline structure in the sidebar.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { LayoutTemplate, ChevronRight, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWriteModeStore } from '@/features/write-mode/writeModeStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import type { OutlineNode } from '@/types/ipc-generated';

import { useOutline } from './useOutline';

/**
 * Extract project ID and article ID from file path.
 * For now, we use a simplified approach where:
 * - projectId defaults to 'default' (will be replaced when project system is integrated)
 * - articleId is derived from the file path
 */
function extractIds(filePath: string | null): { projectId: string; articleId: string } | null {
  if (!filePath) return null;
  // For now, use 'default' as projectId and the file path as articleId
  return {
    projectId: 'default',
    articleId: filePath,
  };
}

/**
 * OutlinePanel component for the sidebar.
 * Shows document outline and allows navigation via click.
 */
export function OutlinePanel() {
  const activeFilePath = useWriteModeStore((s) => s.activeFilePath);
  const markdown = useWriteModeStore((s) => s.markdown);
  const { outline, loading, error, loadOutline } = useOutline();
  const activeEditor = useEditorRuntimeStore((s) => s.activeEditor);

  const ids = useMemo(() => extractIds(activeFilePath), [activeFilePath]);

  // Load outline when file changes
  useEffect(() => {
    if (!ids) return;
    void loadOutline(ids.projectId, ids.articleId);
  }, [ids, loadOutline]);

  // Parse outline from markdown content if backend returns empty
  const parsedOutline = useMemo(() => {
    if (outline.length > 0) return outline;
    if (!markdown) return [];

    // Simple heading parser for fallback
    const lines = markdown.split('\n');
    const nodes: OutlineNode[] = [];
    let id = 0;

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        nodes.push({
          id: `h-${id++}`,
          title,
          level,
        });
      }
    }

    return nodes;
  }, [markdown, outline]);

  const handleNodeClick = useCallback((node: OutlineNode) => {
    if (!activeEditor) return;

    // Search for the heading in the document and scroll to it
    const doc = activeEditor.state.doc;
    let pos = 0;
    let found = false;

    doc.descendants((docNode, docPos) => {
      if (found) return false;
      if (docNode.type.name === 'heading') {
        const text = docNode.textContent;
        if (text === node.title) {
          pos = docPos;
          found = true;
          return false;
        }
      }
      return true;
    });

    if (found) {
      // Set selection to the heading and scroll into view
      activeEditor.chain()
        .setTextSelection(pos)
        .scrollIntoView()
        .focus()
        .run();
    }
  }, [activeEditor]);

  const handleRetry = useCallback(() => {
    if (!ids) return;
    void loadOutline(ids.projectId, ids.articleId);
  }, [ids, loadOutline]);

  // No file open
  if (!activeFilePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <FileText size={24} className="text-[var(--fg-subtle)] mb-2" />
        <div className="text-[11px] text-[var(--fg-muted)] text-center">
          打开文档后显示大纲
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw size={16} className="animate-spin text-[var(--fg-muted)]" />
        <span className="ml-2 text-[11px] text-[var(--fg-muted)]">加载中...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-[var(--error)]">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRetry} className="w-full">
          重试
        </Button>
      </div>
    );
  }

  // Empty outline
  if (parsedOutline.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <LayoutTemplate size={24} className="text-[var(--fg-subtle)] mb-2" />
        <div className="text-[11px] text-[var(--fg-muted)] text-center">
          文档中暂无标题结构
        </div>
        <div className="text-[10px] text-[var(--fg-subtle)] text-center mt-1">
          使用 # 创建标题来生成大纲
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 px-2">
      <div className="text-[10px] text-[var(--fg-subtle)] px-2 mb-2">
        {parsedOutline.length} 个章节
      </div>
      <div className="space-y-0.5">
        {parsedOutline.map((node) => (
          <OutlineNodeItem
            key={node.id}
            node={node}
            onClick={() => handleNodeClick(node)}
          />
        ))}
      </div>
    </div>
  );
}

interface OutlineNodeItemProps {
  node: OutlineNode;
  onClick: () => void;
}

function OutlineNodeItem({ node, onClick }: OutlineNodeItemProps) {
  // Calculate indentation based on heading level
  const indent = (node.level - 1) * 12;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
      style={{ paddingLeft: `${8 + indent}px` }}
    >
      <div className="flex items-center gap-2">
        <ChevronRight 
          size={12} 
          className={cn(
            'shrink-0 transition-colors',
            node.level === 1 
              ? 'text-[var(--accent-default)]' 
              : 'text-[var(--fg-subtle)]'
          )}
        />
        <span
          className={cn(
            'truncate transition-colors',
            node.level === 1
              ? 'text-[11px] font-semibold text-[var(--fg-default)]'
              : node.level === 2
                ? 'text-[11px] font-medium text-[var(--fg-default)]'
                : 'text-[10px] text-[var(--fg-muted)]',
            'group-hover:text-[var(--accent-default)]'
          )}
        >
          {node.title}
        </span>
      </div>
      {node.summary && (
        <div className="text-[9px] text-[var(--fg-subtle)] mt-0.5 truncate" style={{ paddingLeft: `${14}px` }}>
          {node.summary}
        </div>
      )}
    </button>
  );
}
