/**
 * FloatingToolbar (selection-aware overlay)
 * Why: TipTap v3 no longer exports a React BubbleMenu component by default; we implement a small overlay that
 * follows the current selection using ProseMirror coords.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Bold, Italic, Link2, Sparkles, Underline } from 'lucide-react';

import { Divider } from '@/components/ui';
import { ToolbarButton } from './ToolbarButton';

type ToolbarPosition = { x: number; y: number } | null;

export interface FloatingToolbarProps {
  editor: Editor | null;
  containerEl: HTMLElement | null;
  onRequestFocusAi: () => void;
}

export function FloatingToolbar(props: FloatingToolbarProps) {
  const { editor, containerEl, onRequestFocusAi } = props;

  const [position, setPosition] = useState<ToolbarPosition>(null);

  const shouldRender = Boolean(editor && containerEl && position);

  const style = useMemo(() => {
    if (!position) return undefined;
    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: 'translate(-50%, -100%)',
    } as const;
  }, [position]);

  useEffect(() => {
    if (!editor) return;
    if (!containerEl) return;

    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setPosition(null);
        return;
      }

      try {
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        const containerRect = containerEl.getBoundingClientRect();

        const x = (start.left + end.right) / 2 - containerRect.left;
        const y = Math.min(start.top, end.top) - containerRect.top - 8;

        setPosition({ x, y });
      } catch {
        // Why: Selection can become invalid during rapid edits; hide until next stable update.
        setPosition(null);
      }
    };

    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [containerEl, editor]);

  if (!shouldRender) return null;

  return (
    <div
      style={style}
      className="absolute z-20 flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-lg p-1"
    >
      <ToolbarButton
        icon={<Bold className="w-4 h-4" />}
        tooltip="加粗"
        isActive={Boolean(editor?.isActive('bold'))}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic className="w-4 h-4" />}
        tooltip="斜体"
        isActive={Boolean(editor?.isActive('italic'))}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={<Underline className="w-4 h-4" />}
        tooltip="下划线"
        isActive={Boolean(editor?.isActive('underline'))}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />

      <Divider orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        icon={<Link2 className="w-4 h-4" />}
        tooltip="链接"
        isActive={Boolean(editor?.isActive('link'))}
        onClick={() => {
          if (!editor) return;
          const url = window.prompt('链接地址 (https://...)');
          if (!url) return;
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
      />

      <ToolbarButton icon={<Sparkles className="w-4 h-4" />} tooltip="AI" onClick={onRequestFocusAi} />
    </div>
  );
}

export default FloatingToolbar;
