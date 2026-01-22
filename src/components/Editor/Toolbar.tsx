import React from 'react';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo } from 'lucide-react';
import { useEditorState, type Editor as TipTapEditor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

type ToolbarProps = {
  editor: TipTapEditor | null;
};

function ToolbarButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : active
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const { t } = useTranslation();
  useEditorState({
    editor,
    selector: (snapshot) => {
      if (!snapshot.editor) return { docSize: 0, from: 0, to: 0 };
      return {
        docSize: snapshot.editor.state.doc.content.size,
        from: snapshot.editor.state.selection.from,
        to: snapshot.editor.state.selection.to,
      };
    },
  });

  const canUndo = !!editor?.can().undo();
  const canRedo = !!editor?.can().redo();

  // NOTE: Some commands can report `can=false` before the editor is focused.
  // For Sprint 1, prefer usability over aggressive disabling.

  return (
    <div className="flex items-center gap-1">
      <ToolbarButton
        title={t('editor.toolbar.undo')}
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!editor || !canUndo}
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('editor.toolbar.redo')}
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!editor || !canRedo}
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-[var(--border-default)] mx-1" />

      <ToolbarButton
        title={t('editor.toolbar.heading1')}
        active={!!editor?.isActive('heading', { level: 1 })}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        disabled={!editor}
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('editor.toolbar.heading2')}
        active={!!editor?.isActive('heading', { level: 2 })}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={!editor}
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('editor.toolbar.heading3')}
        active={!!editor?.isActive('heading', { level: 3 })}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        disabled={!editor}
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-[var(--border-default)] mx-1" />

      <ToolbarButton
        title={t('editor.toolbar.bold')}
        active={!!editor?.isActive('bold')}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        disabled={!editor}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('editor.toolbar.italic')}
        active={!!editor?.isActive('italic')}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        disabled={!editor}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-[var(--border-default)] mx-1" />

      <ToolbarButton
        title={t('editor.toolbar.bulletList')}
        active={!!editor?.isActive('bulletList')}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        disabled={!editor}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={t('editor.toolbar.orderedList')}
        active={!!editor?.isActive('orderedList')}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        disabled={!editor}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}
