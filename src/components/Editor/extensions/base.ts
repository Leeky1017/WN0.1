import type { AnyExtension } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

export function createEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({
      placeholder: '开始写作…',
    }),
    Markdown.configure({
      indentation: { style: 'space', size: 2 },
    }),
  ];
}

