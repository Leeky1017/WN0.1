/**
 * TipTapEditor
 * Why: Provide a creator-friendly WYSIWYG editor that still serializes to Markdown for `.md` persistence.
 *
 * Notes:
 * - We intentionally keep the editor instance internal and only apply external content when `contentVersion` changes
 *   to avoid feedback loops (typing -> onUpdate -> setState -> setContent).
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import type { EditorMode } from '@/stores';

function getMarkdownFromEditor(editor: Editor): string {
  const maybe = editor as unknown as {
    getMarkdown?: () => string;
    storage?: { markdown?: { getMarkdown?: () => string } };
  };
  if (typeof maybe.getMarkdown === 'function') return maybe.getMarkdown();
  const storageFn = maybe.storage?.markdown?.getMarkdown;
  if (typeof storageFn === 'function') return storageFn();
  return editor.getText();
}

export interface TipTapEditorProps {
  /** Markdown content to load into the editor when `contentVersion` changes. */
  content: string;
  /** Increments to re-apply `content` programmatically (e.g. file opened, restore). */
  contentVersion: number;
  /** Editor UI mode; used for styling/behavior toggles. */
  mode: EditorMode;

  onEditorReady: (editor: Editor | null) => void;
  onFocusChanged: (focused: boolean) => void;
  onMarkdownChanged: (markdown: string) => void;
}

export function TipTapEditor(props: TipTapEditorProps) {
  const { content, contentVersion, mode, onEditorReady, onFocusChanged, onMarkdownChanged } = props;

  const isApplyingExternalUpdateRef = useRef(false);

  const extensions = useMemo(
    () => [
      StarterKit,
      Markdown.configure({
        indentation: { style: 'space', size: 2 },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-[var(--accent)] underline underline-offset-2',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: mode === 'markdown' ? '开始用 Markdown 写作…' : '开始写作…',
      }),
      CharacterCount.configure(),
    ],
    [mode],
  );

  const editor = useEditor(
    {
      extensions,
      content,
      contentType: 'markdown',
      editorProps: {
        attributes: {
          class:
            'wn-tiptap-editor h-full w-full px-6 py-5 outline-none text-[var(--text-primary)]',
          'data-editor-mode': mode,
        },
        handleDOMEvents: {
          focus: () => {
            onFocusChanged(true);
            return false;
          },
          blur: () => {
            onFocusChanged(false);
            return false;
          },
          keydown: (_view, event) => {
            // Why: Manual save is handled at a higher layer (EditorPanel) so we do not bind it here.
            void event;
            return false;
          },
        },
      },
      onUpdate: ({ editor: next }: { editor: Editor }) => {
        if (isApplyingExternalUpdateRef.current) return;
        onMarkdownChanged(getMarkdownFromEditor(next));
      },
    },
    [extensions],
  );

  useEffect(() => {
    onEditorReady(editor ?? null);
    return () => onEditorReady(null);
    // Why: The callback is stable for the EditorPanel lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    void contentVersion;
    const current = getMarkdownFromEditor(editor);
    if (current === content) return;

    isApplyingExternalUpdateRef.current = true;
    editor.commands.setContent(content, { emitUpdate: false, contentType: 'markdown' });
    isApplyingExternalUpdateRef.current = false;
  }, [content, contentVersion, editor]);

  return <EditorContent editor={editor} className="h-full w-full overflow-auto" />;
}

export default TipTapEditor;
