/**
 * AI Diff Extension (core)
 * Why: We need a deterministic, editor-internal preview/apply mechanism for AI rewrites that does not pollute the
 * persisted Markdown. A ProseMirror plugin with a DecorationSet gives us a reversible UI layer, and explicit commands
 * allow higher layers (AI panel/streaming) to orchestrate show/accept/reject with clear failure semantics.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Schema, Node as ProseMirrorNode } from '@tiptap/pm/model';

import { computeDiff, mergeDiff } from '@/lib/diff/diffUtils';
import type { DiffHunk } from '@/lib/diff/diffUtils';
import type { IpcError } from '@/types/ipc-generated';

export type AiDiffHunk = DiffHunk;

export type AiDiffSelection = {
  from: number;
  to: number;
};

export type AiDiffSessionInput = {
  runId: string;
  /** Snapshot text the diff was computed against (selection snapshot). */
  originalText: string;
  /** AI output text for the same selection scope. */
  suggestedText: string;
  /** Selection coordinates captured at run start (doc positions in TipTap). */
  selection: AiDiffSelection;
  createdAt: number;
};

export type AiDiffSession = AiDiffSessionInput & {
  hunks: AiDiffHunk[];
  /**
   * Accept mask for hunks, aligned with `mergeDiff` semantics:
   * - add: true => include added content
   * - remove: true => drop removed content (accept deletion)
   */
  accepted: boolean[];
};

export type AiDiffPluginState = {
  session: AiDiffSession | null;
  decorations: DecorationSet;
  lastError: IpcError | null;
};

export const AiDiffPluginKey = new PluginKey('wnAiDiff');

type AiDiffMeta =
  | { type: 'set'; next: AiDiffPluginState }
  | { type: 'clear' }
  | { type: 'error'; error: IpcError };

export type AiDiffAdapter = {
  /**
   * Why: Commands return boolean in TipTap; an explicit error hook avoids silent failures and keeps UI policy out of
   * the extension.
   */
  reportError: (error: IpcError) => void;
  /** Optional hook for higher layers (e.g. version history) after applying the change. */
  onApplied?: (payload: { runId: string; mergedText: string }) => void;
};

export type AiDiffExtensionOptions = {
  adapter?: AiDiffAdapter;
};

function makeIpcError(code: IpcError['code'], message: string, details?: Record<string, unknown>): IpcError {
  return { code, message, ...(details ? { details } : {}) };
}

function emitError(tr: Transaction, error: IpcError): Transaction {
  return tr.setMeta(AiDiffPluginKey, { type: 'error', error } satisfies AiDiffMeta);
}

function getSelectionText(doc: ProseMirrorNode, selection: AiDiffSelection): string {
  return doc.textBetween(selection.from, selection.to, '\n');
}

function normalizeSelectionText(text: string): string {
  return text.replace(/\r\n/g, '\n').trimEnd();
}

function mapSelection(selection: AiDiffSelection, tr: Transaction): AiDiffSelection | null {
  const maxPos = tr.doc.content.size;
  const nextFrom = tr.mapping.map(selection.from, 1);
  const nextTo = tr.mapping.map(selection.to, -1);
  if (nextFrom < 0 || nextTo < 0 || nextFrom > nextTo || nextTo > maxPos) return null;
  return { from: nextFrom, to: nextTo };
}

function buildInlineSliceFromText(schema: Schema, text: string): Slice {
  const hardBreak = schema.nodes.hardBreak;
  if (!hardBreak) {
    if (text.includes('\n')) {
      throw new Error('hardBreak node missing; cannot insert multi-line content into a textblock');
    }
    const nodes = text.length > 0 ? [schema.text(text)] : [];
    return new Slice(Fragment.fromArray(nodes), 0, 0);
  }

  const parts = text.split('\n');
  const nodes: ProseMirrorNode[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.length > 0) nodes.push(schema.text(part));
    if (i < parts.length - 1) nodes.push(hardBreak.create());
  }
  return new Slice(Fragment.fromArray(nodes), 0, 0);
}

function buildBlockSliceFromText(schema: Schema, text: string): Slice {
  const paragraph = schema.nodes.paragraph;
  if (!paragraph) {
    throw new Error('paragraph node missing; cannot insert block content');
  }

  const lines = text.split('\n');
  const nodes: ProseMirrorNode[] = lines.map((line) => {
    if (line.length === 0) return paragraph.createAndFill() ?? paragraph.create();
    return paragraph.create(null, schema.text(line));
  });

  return new Slice(Fragment.fromArray(nodes), 0, 0);
}

function buildReplacementSlice(schema: Schema, doc: ProseMirrorNode, selection: AiDiffSelection, text: string): Slice {
  const $from = doc.resolve(selection.from);
  const $to = doc.resolve(selection.to);
  const sameTextblock = $from.sameParent($to) && $from.parent.isTextblock;
  return sameTextblock ? buildInlineSliceFromText(schema, text) : buildBlockSliceFromText(schema, text);
}

function buildDiffPreviewDom(view: EditorView, session: AiDiffSession): HTMLElement {
  const doc = view.dom.ownerDocument;
  const container = doc.createElement('div');
  container.className = 'wn-ai-diff-preview';
  container.setAttribute('data-run-id', session.runId);
  container.setAttribute('contenteditable', 'false');

  const pre = doc.createElement('pre');
  pre.className = 'wn-ai-diff-preview__content';
  pre.style.margin = '0';
  pre.style.whiteSpace = 'pre-wrap';

  for (const hunk of session.hunks) {
    const span = doc.createElement('span');
    span.className = `wn-ai-diff-hunk wn-ai-diff-${hunk.type}`;
    span.textContent = hunk.content;
    pre.appendChild(span);
  }

  container.appendChild(pre);
  return container;
}

function buildDecorations(doc: ProseMirrorNode, session: AiDiffSession): DecorationSet {
  const decorations: Decoration[] = [];

  if (session.selection.from < session.selection.to) {
    decorations.push(
      Decoration.inline(session.selection.from, session.selection.to, {
        class: 'wn-ai-diff-scope',
      }),
    );
  }

  decorations.push(
    Decoration.widget(
      session.selection.to,
      (view) => buildDiffPreviewDom(view, session),
      {
        side: 1,
        key: `wn-ai-diff:${session.runId}`,
      },
    ),
  );

  return DecorationSet.create(doc, decorations);
}

export const AiDiffExtension = Extension.create<AiDiffExtensionOptions>({
  name: 'aiDiff',

  addOptions() {
    return { adapter: undefined };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AiDiffPluginKey,
        state: {
          init: () =>
            ({
              session: null,
              decorations: DecorationSet.empty,
              lastError: null,
            }) satisfies AiDiffPluginState,
          apply: (tr, prev: AiDiffPluginState) => {
            const meta = tr.getMeta(AiDiffPluginKey) as AiDiffMeta | undefined;
            if (meta?.type === 'set') return meta.next;
            if (meta?.type === 'clear') {
              return { session: null, decorations: DecorationSet.empty, lastError: null };
            }
            if (meta?.type === 'error') {
              return { ...prev, lastError: meta.error };
            }

            const mappedDecorations = prev.decorations.map(tr.mapping, tr.doc);
            if (!prev.session) return { ...prev, decorations: mappedDecorations };

            const nextSelection = mapSelection(prev.session.selection, tr);
            if (!nextSelection) {
              return { session: null, decorations: DecorationSet.empty, lastError: prev.lastError };
            }

            return {
              ...prev,
              session: { ...prev.session, selection: nextSelection },
              decorations: mappedDecorations,
            };
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = AiDiffPluginKey.getState(state) as AiDiffPluginState | null;
            return pluginState?.decorations ?? null;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      /**
       * Show AI diff preview for a selection snapshot.
       * Why: The command validates the snapshot against the current document to prevent "previewing the wrong text"
       * when the editor has changed since the AI run started.
       */
      showAiDiff:
        (input: AiDiffSessionInput) =>
        ({ editor }) => {
          const maxPos = editor.state.doc.content.size;
          const { from, to } = input.selection;

          if (from < 0 || to < 0 || from > to || to > maxPos) {
            const error = makeIpcError('INVALID_ARGUMENT', 'Invalid selection range for AI diff preview');
            this.options.adapter?.reportError(error);
            editor.view.dispatch(emitError(editor.state.tr, error));
            return false;
          }

          const currentText = getSelectionText(editor.state.doc, input.selection);
          if (normalizeSelectionText(currentText) !== normalizeSelectionText(input.originalText)) {
            const error = makeIpcError('CONFLICT', 'Selection changed; cannot show AI diff safely', {
              runId: input.runId,
              originalLen: input.originalText.length,
              currentLen: currentText.length,
            });
            this.options.adapter?.reportError(error);
            editor.view.dispatch(emitError(editor.state.tr, error));
            return false;
          }

          const hunks = computeDiff(input.originalText, input.suggestedText) as AiDiffHunk[];
          const accepted = hunks.map(() => true);
          const session: AiDiffSession = { ...input, hunks, accepted };
          const decorations = buildDecorations(editor.state.doc, session);

          const next: AiDiffPluginState = {
            session,
            decorations,
            lastError: null,
          };

          editor.view.dispatch(
            editor.state.tr.setMeta(AiDiffPluginKey, { type: 'set', next } satisfies AiDiffMeta),
          );
          return true;
        },

      /**
       * Apply the currently previewed AI diff (accept all).
       * Why: We guard against selection drift to avoid unintentionally overwriting user edits.
       */
      acceptAiDiff:
        () =>
        ({ editor }) => {
          const pluginState = AiDiffPluginKey.getState(editor.state) as AiDiffPluginState | null;
          if (!pluginState?.session) return false;

          const { session } = pluginState;
          const currentText = getSelectionText(editor.state.doc, session.selection);
          if (normalizeSelectionText(currentText) !== normalizeSelectionText(session.originalText)) {
            const error = makeIpcError('CONFLICT', 'Selection changed; cannot apply AI diff safely', {
              runId: session.runId,
              originalLen: session.originalText.length,
              currentLen: currentText.length,
            });
            this.options.adapter?.reportError(error);
            editor.view.dispatch(emitError(editor.state.tr, error));
            return false;
          }

          let mergedText: string;
          try {
            mergedText = mergeDiff(session.originalText, session.suggestedText, session.accepted);
          } catch (e) {
            const error = makeIpcError(
              'INTERNAL',
              e instanceof Error ? e.message : 'Failed to merge AI diff',
              { runId: session.runId },
            );
            this.options.adapter?.reportError(error);
            editor.view.dispatch(emitError(editor.state.tr, error));
            return false;
          }

          try {
            const slice = buildReplacementSlice(editor.schema, editor.state.doc, session.selection, mergedText);
            const tr = editor.state.tr.replaceRange(session.selection.from, session.selection.to, slice);
            tr.setMeta(AiDiffPluginKey, { type: 'clear' } satisfies AiDiffMeta);
            editor.view.dispatch(tr);
            this.options.adapter?.onApplied?.({ runId: session.runId, mergedText });
            return true;
          } catch (e) {
            const error = makeIpcError(
              'UNSUPPORTED',
              e instanceof Error ? e.message : 'Failed to apply AI diff',
              { runId: session.runId },
            );
            this.options.adapter?.reportError(error);
            editor.view.dispatch(emitError(editor.state.tr, error));
            return false;
          }
        },

      /**
       * Reject the currently previewed AI diff (clear preview only).
       */
      rejectAiDiff:
        () =>
        ({ editor }) => {
          editor.view.dispatch(editor.state.tr.setMeta(AiDiffPluginKey, { type: 'clear' } satisfies AiDiffMeta));
          return true;
        },

      /**
       * Clear AI diff preview (alias used by cancel/timeout paths).
       */
      clearAiDiff:
        () =>
        ({ editor }) => {
          editor.view.dispatch(editor.state.tr.setMeta(AiDiffPluginKey, { type: 'clear' } satisfies AiDiffMeta));
          return true;
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiDiff: {
      showAiDiff: (session: AiDiffSessionInput) => ReturnType;
      acceptAiDiff: () => ReturnType;
      rejectAiDiff: () => ReturnType;
      clearAiDiff: () => ReturnType;
    };
  }
}
