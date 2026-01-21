import type { Editor as TiptapEditor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

import type { EditorContext } from '../../types/context';

type TextBlock = { text: string; contentFrom: number; contentTo: number };

function clampNonNegativeInt(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), max);
}

function clampPositiveInt(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function collectTextBlocks(doc: ProseMirrorNode): TextBlock[] {
  const blocks: TextBlock[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const contentFrom = pos + 1;
    const contentTo = pos + node.nodeSize - 1;
    blocks.push({ text: node.textContent.trim(), contentFrom, contentTo });
  });
  return blocks;
}

function findTextBlockIndex(blocks: TextBlock[], cursorPos: number): number {
  const safePos = clampNonNegativeInt(cursorPos, Number.MAX_SAFE_INTEGER);
  for (let idx = 0; idx < blocks.length; idx += 1) {
    const block = blocks[idx];
    if (safePos >= block.contentFrom && safePos <= block.contentTo) return idx;
  }
  return blocks.length > 0 ? 0 : -1;
}

function normalizeNewlines(text: string): string {
  return text.replaceAll('\r\n', '\n');
}

type TextParagraph = { start: number; end: number; text: string };

function splitParagraphRanges(text: string): TextParagraph[] {
  const normalized = normalizeNewlines(text);
  if (!normalized.trim()) return [];

  const ranges: TextParagraph[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const sepMatch = /\n{2,}/g.exec(normalized.slice(cursor));
    if (!sepMatch) {
      const start = cursor;
      const end = normalized.length;
      const paragraph = normalized.slice(start, end).trim();
      if (paragraph) ranges.push({ start, end, text: paragraph });
      break;
    }

    const sepStart = cursor + sepMatch.index;
    const sepEnd = sepStart + sepMatch[0].length;
    const start = cursor;
    const end = sepStart;
    const paragraph = normalized.slice(start, end).trim();
    if (paragraph) ranges.push({ start, end, text: paragraph });
    cursor = sepEnd;
  }

  return ranges;
}

function findParagraphIndex(ranges: TextParagraph[], cursorOffset: number): number {
  if (ranges.length === 0) return -1;
  const safeOffset = clampNonNegativeInt(cursorOffset, Number.MAX_SAFE_INTEGER);
  for (let idx = 0; idx < ranges.length; idx += 1) {
    const r = ranges[idx];
    if (safeOffset >= r.start && safeOffset <= r.end) return idx;
  }

  let lastBefore = 0;
  for (let idx = 0; idx < ranges.length; idx += 1) {
    if (ranges[idx].start <= safeOffset) lastBefore = idx;
  }
  return lastBefore;
}

function cursorFromSelection(range: { start: number; end: number }): number {
  return Math.max(range.start, range.end);
}

function computeLineColumnFromOffset(text: string, offset: number): { line: number; column: number } {
  const normalized = normalizeNewlines(text);
  const safeOffset = clampNonNegativeInt(offset, normalized.length);
  const before = normalized.slice(0, safeOffset);
  const lastNl = before.lastIndexOf('\n');
  const line = before.split('\n').length;
  const column = safeOffset - (lastNl === -1 ? 0 : lastNl + 1) + 1;
  return { line: Math.max(1, line), column: Math.max(1, column) };
}

/**
 * Computes Immediate editor context from TipTap state.
 *
 * Why:
 * - Context engine needs a UI-independent SSOT for selection + local window text.
 * - Use paragraph-level windows (N before/after) to keep token usage predictable.
 */
export function computeEditorContextFromTipTap(editor: TiptapEditor, input: { windowParagraphs: number }): EditorContext {
  const state = editor.state;
  const selection = state.selection;
  const from = selection.from;
  const to = selection.to;

  const selectedTextRaw = from !== to ? state.doc.textBetween(from, to, '\n', '\n') : '';
  const selectedText = selectedTextRaw.trim() ? selectedTextRaw.trim() : null;

  const blocks = collectTextBlocks(state.doc);
  const windowParagraphs = clampPositiveInt(input.windowParagraphs);
  const currentIdx = findTextBlockIndex(blocks, selection.$from.pos);

  const currentParagraph = currentIdx >= 0 ? blocks[currentIdx]?.text ?? '' : '';
  const before = currentIdx > 0 ? blocks.slice(Math.max(0, currentIdx - windowParagraphs), currentIdx).map((b) => b.text).filter(Boolean) : [];
  const after =
    currentIdx >= 0
      ? blocks
          .slice(currentIdx + 1, currentIdx + 1 + windowParagraphs)
          .map((b) => b.text)
          .filter(Boolean)
      : [];

  const cursorLine = currentIdx >= 0 ? currentIdx + 1 : 1;
  const cursorColumn = Math.max(1, selection.$from.parentOffset + 1);

  return {
    selectedText,
    cursorLine,
    cursorColumn,
    currentParagraph,
    surroundingParagraphs: { before, after },
    detectedEntities: [],
  };
}

/**
 * Computes Immediate editor context from plain markdown text + selection range.
 *
 * Why:
 * - Markdown mode still needs a single Immediate SSOT for context assembly and entity detection.
 */
export function computeEditorContextFromMarkdown(input: {
  content: string;
  selection: { start: number; end: number } | null;
  windowParagraphs: number;
}): EditorContext {
  const content = typeof input.content === 'string' ? input.content : '';
  const normalized = normalizeNewlines(content);
  const maxOffset = normalized.length;

  const range = input.selection ?? { start: 0, end: 0 };
  const start = clampNonNegativeInt(Math.min(range.start, range.end), maxOffset);
  const end = clampNonNegativeInt(Math.max(range.start, range.end), maxOffset);
  const selectionTextRaw = start !== end ? normalized.slice(start, end) : '';
  const selectedText = selectionTextRaw.trim() ? selectionTextRaw.trim() : null;

  const cursorOffset = cursorFromSelection({ start, end });
  const { line: cursorLine, column: cursorColumn } = computeLineColumnFromOffset(normalized, cursorOffset);

  const ranges = splitParagraphRanges(normalized);
  const windowParagraphs = clampPositiveInt(input.windowParagraphs);
  const currentIdx = findParagraphIndex(ranges, cursorOffset);

  const currentParagraph = currentIdx >= 0 ? ranges[currentIdx]?.text ?? '' : '';
  const before =
    currentIdx > 0 ? ranges.slice(Math.max(0, currentIdx - windowParagraphs), currentIdx).map((r) => r.text).filter(Boolean) : [];
  const after =
    currentIdx >= 0
      ? ranges
          .slice(currentIdx + 1, currentIdx + 1 + windowParagraphs)
          .map((r) => r.text)
          .filter(Boolean)
      : [];

  return {
    selectedText,
    cursorLine,
    cursorColumn,
    currentParagraph,
    surroundingParagraphs: { before, after },
    detectedEntities: [],
  };
}

