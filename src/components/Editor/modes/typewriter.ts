import type { Editor as TipTapEditor } from '@tiptap/react';

export type TypewriterConfig = {
  tolerancePx: number;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getLineHeightPx(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) return lineHeight;

  const fontSize = Number.parseFloat(style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) return fontSize * 1.6;
  return 20;
}

function getPaddingTopPx(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const paddingTop = Number.parseFloat(style.paddingTop);
  return Number.isFinite(paddingTop) && paddingTop >= 0 ? paddingTop : 0;
}

function countLinesBeforeOffset(text: string, offset: number): number {
  const max = Math.min(text.length, Math.max(0, Math.floor(offset)));
  let lines = 1;
  for (let i = 0; i < max; i += 1) {
    if (text[i] === '\n') lines += 1;
  }
  return lines;
}

/**
 * Why: Typewriter mode stabilizes the user's gaze by keeping the caret line
 * near the vertical center of the scroll viewport with a tolerance band (no jitter).
 */
export function applyTypewriterToTextarea(textarea: HTMLTextAreaElement, config: TypewriterConfig) {
  const tolerancePx = Math.max(0, Math.floor(config.tolerancePx));
  if (textarea.clientHeight <= 0) return;

  const selectionStart = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : 0;
  const text = textarea.value ?? '';
  const line = countLinesBeforeOffset(text, selectionStart);

  const lineHeight = getLineHeightPx(textarea);
  const paddingTop = getPaddingTopPx(textarea);
  const caretY = paddingTop + (line - 0.5) * lineHeight;

  const centerY = textarea.scrollTop + textarea.clientHeight / 2;
  const min = centerY - tolerancePx;
  const max = centerY + tolerancePx;

  let nextScrollTop = textarea.scrollTop;
  if (caretY < min) nextScrollTop -= min - caretY;
  if (caretY > max) nextScrollTop += caretY - max;

  const maxScrollTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
  nextScrollTop = clamp(nextScrollTop, 0, maxScrollTop);

  if (Math.abs(nextScrollTop - textarea.scrollTop) < 1) return;
  textarea.scrollTop = nextScrollTop;
}

/**
 * Why: In rich-text mode we can't rely on line counting, so we use ProseMirror's
 * caret coordinates and scroll the editor container toward a tolerant center band.
 */
export function applyTypewriterToTipTap(editor: TipTapEditor, scrollContainer: HTMLElement, config: TypewriterConfig) {
  const tolerancePx = Math.max(0, Math.floor(config.tolerancePx));
  if (scrollContainer.clientHeight <= 0) return;

  const selectionPos = editor.state.selection.from;
  let caretViewportY = 0;

  try {
    const coords = editor.view.coordsAtPos(selectionPos);
    caretViewportY = (coords.top + coords.bottom) / 2;
  } catch {
    return;
  }

  const rect = scrollContainer.getBoundingClientRect();
  const caretY = caretViewportY - rect.top + scrollContainer.scrollTop;

  const centerY = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
  const min = centerY - tolerancePx;
  const max = centerY + tolerancePx;

  let nextScrollTop = scrollContainer.scrollTop;
  if (caretY < min) nextScrollTop -= min - caretY;
  if (caretY > max) nextScrollTop += caretY - max;

  const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
  nextScrollTop = clamp(nextScrollTop, 0, maxScrollTop);

  if (Math.abs(nextScrollTop - scrollContainer.scrollTop) < 1) return;
  scrollContainer.scrollTop = nextScrollTop;
}

