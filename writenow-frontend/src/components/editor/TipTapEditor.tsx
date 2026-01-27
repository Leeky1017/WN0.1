/**
 * TipTapEditor
 * Why: Provide a creator-friendly WYSIWYG editor that still serializes to Markdown for `.md` persistence.
 *
 * Notes:
 * - We intentionally keep the editor instance internal and only apply external content when `contentVersion` changes
 *   to avoid feedback loops (typing -> onUpdate -> setState -> setContent).
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Editor, InputRule } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import CodeBlock from '@tiptap/extension-code-block';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { UndoRedo } from '@tiptap/extensions';
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

import { AiDiffExtension } from '@/lib/editor/extensions/ai-diff';
import { createLocalLlmTabCompletionPlugin, localLlmTabPluginKey } from '@/lib/editor/extensions/tab-completion';
import type { LocalLlmTabClient } from '@/lib/editor/extensions/tab-completion';
import { useAIStore } from '@/stores/aiStore';
import type { EditorMode } from '@/stores';

const EMPTY_INPUT_RULES: InputRule[] = [];
const DEFAULT_LOCAL_LLM_STOP = ['\n\n'];

const RichHeading = Heading.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichBlockquote = Blockquote.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichBulletList = BulletList.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichOrderedList = OrderedList.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichCodeBlock = CodeBlock.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichHorizontalRule = HorizontalRule.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichBold = Bold.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichItalic = Italic.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichStrike = Strike.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

const RichCode = Code.extend({
  addInputRules() {
    return EMPTY_INPUT_RULES;
  },
});

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
  /** When true, editor becomes read-only (no edits / no autosave). */
  readOnly?: boolean;

  /** Optional local LLM tab completion wiring (must be stable to avoid re-registering per keystroke). */
  localLlmTabCompletion?: {
    enabled: boolean;
    client: LocalLlmTabClient | null;
    minPrefixChars: number;
    maxPrefixChars: number;
    maxSuffixChars: number;
    idleDelayMs: number;
    maxTokens: number;
    temperature: number;
    timeoutMs: number;
    stop: string[];
  };

  onEditorReady: (editor: Editor | null) => void;
  onFocusChanged: (focused: boolean) => void;
  onMarkdownChanged: (markdown: string) => void;
}

export function TipTapEditor(props: TipTapEditorProps) {
  const { content, contentVersion, mode, readOnly = false, localLlmTabCompletion, onEditorReady, onFocusChanged, onMarkdownChanged } = props;

  const isApplyingExternalUpdateRef = useRef(false);
  const localLlmStopKey = (localLlmTabCompletion?.stop ?? DEFAULT_LOCAL_LLM_STOP).join('\u0000');

  const extensions = useMemo(
    () => [
      ...(mode === 'markdown'
        ? [
            StarterKit,
            Markdown.configure({
              indentation: { style: 'space', size: 2 },
            }),
          ]
        : [
            Document,
            Paragraph,
            Text,
            UndoRedo,
            HardBreak,
            RichHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
            RichBold,
            RichItalic,
            RichStrike,
            RichCode,
            RichBlockquote,
            ListItem,
            RichBulletList,
            RichOrderedList,
            RichCodeBlock,
            RichHorizontalRule,
            Markdown.configure({
              indentation: { style: 'space', size: 2 },
            }),
          ]),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-[var(--accent-default)] underline underline-offset-2',
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
      AiDiffExtension.configure({
        adapter: {
          reportError: (error) => {
            useAIStore.getState().setLastError(error);
          },
        },
      }),
    ],
    [mode],
  );

  const editor = useEditor(
    {
      extensions,
      content,
      contentType: 'markdown',
      editable: !readOnly,
      editorProps: {
        attributes: {
          class:
            'wn-tiptap-editor outline-none text-[var(--fg-default)]',
          'data-editor-mode': mode,
          'data-testid': 'tiptap-editor',
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
    if (!editor) return;

    const enabled = Boolean(localLlmTabCompletion?.enabled) && Boolean(localLlmTabCompletion?.client);
    const client = localLlmTabCompletion?.client ?? null;

    const current = localLlmTabPluginKey.getState(editor.state);
    if (client && current?.runId) {
      void client.cancel({ runId: current.runId, reason: 'user' }).catch(() => undefined);
    }
    editor.unregisterPlugin(localLlmTabPluginKey);

    if (!enabled || !client) return;

    const stop = localLlmStopKey ? localLlmStopKey.split('\u0000') : [];

    editor.registerPlugin(
      createLocalLlmTabCompletionPlugin({
        enabled: true,
        client,
        minPrefixChars: localLlmTabCompletion?.minPrefixChars ?? 24,
        maxPrefixChars: localLlmTabCompletion?.maxPrefixChars ?? 4000,
        maxSuffixChars: localLlmTabCompletion?.maxSuffixChars ?? 2000,
        idleDelayMs: localLlmTabCompletion?.idleDelayMs ?? 800,
        maxTokens: localLlmTabCompletion?.maxTokens ?? 48,
        temperature: localLlmTabCompletion?.temperature ?? 0.4,
        timeoutMs: localLlmTabCompletion?.timeoutMs ?? 15_000,
        stop,
      }),
    );

    return () => {
      const next = localLlmTabPluginKey.getState(editor.state);
      if (client && next?.runId) {
        void client.cancel({ runId: next.runId, reason: 'user' }).catch(() => undefined);
      }
      editor.unregisterPlugin(localLlmTabPluginKey);
    };
  }, [
    editor,
    localLlmTabCompletion?.client,
    localLlmTabCompletion?.enabled,
    localLlmTabCompletion?.idleDelayMs,
    localLlmTabCompletion?.maxPrefixChars,
    localLlmTabCompletion?.maxSuffixChars,
    localLlmTabCompletion?.maxTokens,
    localLlmTabCompletion?.minPrefixChars,
    localLlmStopKey,
    localLlmTabCompletion?.temperature,
    localLlmTabCompletion?.timeoutMs,
  ]);

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

  return (
    <div className="h-full w-full bg-[var(--bg-base)] overflow-y-auto overflow-x-hidden">
      {/* Centered content column - max-width 70ch for optimal reading */}
      <div className="min-h-full w-full flex flex-col items-center pt-12 pb-32 px-8 md:px-16">
        <div className="w-full max-w-[70ch]">
          <EditorContent editor={editor} className="w-full" />
        </div>
      </div>
    </div>
  );
}

export default TipTapEditor;
