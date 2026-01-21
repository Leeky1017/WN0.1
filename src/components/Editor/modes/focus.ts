import type { Editor as TipTapEditor } from '@tiptap/react';

export type ParagraphFocusConfig = {
  dimOpacity: number;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function getActiveBlock(editorDom: HTMLElement, editor: TipTapEditor): HTMLElement | null {
  const selectionPos = editor.state.selection.from;
  let node: Node | null = null;

  try {
    node = editor.view.domAtPos(selectionPos).node;
  } catch {
    return null;
  }

  let el: HTMLElement | null = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (el && el.parentElement && el.parentElement !== editorDom) {
    el = el.parentElement;
  }
  return el && el.parentElement === editorDom ? el : null;
}

/**
 * Why: Paragraph focus reduces visual noise by de-emphasizing non-current blocks,
 * without intercepting pointer events so selection/copy keeps working naturally.
 */
export function applyParagraphFocus(editor: TipTapEditor, config: ParagraphFocusConfig) {
  const root = editor.view.dom as HTMLElement | null;
  if (!root) return;

  const dimOpacity = clamp(config.dimOpacity, 0.05, 0.95);
  root.classList.add('wn-focus-mode');
  root.style.setProperty('--wn-focus-dim-opacity', String(dimOpacity));

  const nextActive = getActiveBlock(root, editor);
  const prevActive = root.querySelector<HTMLElement>('.wn-focus-active-block');

  if (prevActive && prevActive !== nextActive) prevActive.classList.remove('wn-focus-active-block');
  if (nextActive) nextActive.classList.add('wn-focus-active-block');
}

export function clearParagraphFocus(editor: TipTapEditor) {
  const root = editor.view.dom as HTMLElement | null;
  if (!root) return;

  root.classList.remove('wn-focus-mode');
  root.style.removeProperty('--wn-focus-dim-opacity');

  const active = root.querySelector<HTMLElement>('.wn-focus-active-block');
  if (active) active.classList.remove('wn-focus-active-block');
}

