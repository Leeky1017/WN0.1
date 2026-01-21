import React, { useEffect, useRef, useState } from 'react';
import { X, MoreHorizontal, Eye, Edit3, Columns } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import type { ViewMode } from '../../App';
import { fileOps } from '../../lib/ipc';
import { useEditorContextStore } from '../../stores/editorContextStore';
import { useEditorStore } from '../../stores/editorStore';
import { Toolbar } from './Toolbar';
import { MarkdownPreview } from './MarkdownPreview';
import { createEditorExtensions } from './extensions/base';
import { computeEditorContextFromMarkdown, computeEditorContextFromTipTap } from './editor-context-sync';
import { WnResizable } from '../wn';

interface EditorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  focusMode: boolean;
}

function getShortcutKeyLabel() {
  return window.writenow?.platform === 'darwin' ? '⌘' : 'Ctrl';
}

function getOffsetForLine(content: string, line: number) {
  const safeLine = Math.max(1, Math.floor(line));
  if (safeLine === 1) return 0;
  let currentLine = 1;
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '\n') {
      currentLine += 1;
      if (currentLine === safeLine) return i + 1;
    }
  }
  return content.length;
}

const EDITOR_SPLIT_STORAGE_KEY = 'WN_EDITOR_SPLIT_LEFT_PX_V1';
const EDITOR_SPLIT_MIN_PX = 360;

export function Editor({ viewMode, onViewModeChange, focusMode }: EditorProps) {
  const { t } = useTranslation();
  const currentPath = useEditorStore((s) => s.currentPath);
  const content = useEditorStore((s) => s.content);
  const editorMode = useEditorStore((s) => s.editorMode);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isLoading = useEditorStore((s) => s.isLoading);
  const loadError = useEditorStore((s) => s.loadError);
  const selection = useEditorStore((s) => s.selection);

  const setContent = useEditorStore((s) => s.setContent);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const save = useEditorStore((s) => s.save);
  const closeFile = useEditorStore((s) => s.closeFile);
  const pendingJumpLine = useEditorStore((s) => s.pendingJumpLine);
  const consumeJumpToLine = useEditorStore((s) => s.consumeJumpToLine);

  const [lineCount, setLineCount] = useState(1);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastSnapshotContentRef = useRef<string>('');
  const lastSnapshotPathRef = useRef<string>('');
  const isProgrammaticTipTapUpdateRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markdownSyncTimerRef = useRef<number | null>(null);
  const tiptapSyncTimerRef = useRef<number | null>(null);
  const scheduleTipTapSyncRef = useRef<((editor: Parameters<typeof computeEditorContextFromTipTap>[0]) => void) | null>(null);
  const splitRootRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const [splitContainerWidth, setSplitContainerWidth] = useState<number | null>(null);
  const [splitLeftPx, setSplitLeftPx] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(EDITOR_SPLIT_STORAGE_KEY);
      const parsed = raw ? Number(raw) : Number.NaN;
      if (!Number.isFinite(parsed) || parsed <= 0) return 0;
      return Math.floor(parsed);
    } catch {
      return 0;
    }
  });

  const editorContextDebounceMs = useEditorContextStore((s) => s.config.debounceMs);
  const editorContextWindowParagraphs = useEditorContextStore((s) => s.config.windowParagraphs);
  const setEditorContext = useEditorContextStore((s) => s.setContext);
  const setEditorContextSyncError = useEditorContextStore((s) => s.setSyncError);
  const clearEditorContext = useEditorContextStore((s) => s.clear);

  useEffect(() => {
    setLineCount(content.split('\n').length);
  }, [content]);

  useEffect(() => {
    if (viewMode !== 'split') return;
    const el = splitRootRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry ? Math.floor(entry.contentRect.width) : 0;
      setSplitContainerWidth(width > 0 ? width : null);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'split') return;
    const width = splitContainerWidth;
    if (!width) return;

    const min = EDITOR_SPLIT_MIN_PX;
    const max = Math.max(min, width - EDITOR_SPLIT_MIN_PX);
    setSplitLeftPx((prev) => {
      const base = prev > 0 ? prev : Math.floor(width / 2);
      return Math.min(max, Math.max(min, base));
    });
  }, [splitContainerWidth, viewMode]);

  useEffect(() => {
    if (!Number.isFinite(splitLeftPx) || splitLeftPx <= 0) return;
    try {
      localStorage.setItem(EDITOR_SPLIT_STORAGE_KEY, String(Math.floor(splitLeftPx)));
    } catch {
      // ignore (non-critical preference persistence)
    }
  }, [splitLeftPx]);

  useEffect(() => {
    if (viewMode !== 'split') return;
    const editorEl = editorScrollRef.current;
    const previewEl = previewScrollRef.current;
    if (!editorEl || !previewEl) return;

    let locked = false;
    let rafId = 0;

    const syncScroll = (from: HTMLElement, to: HTMLElement) => {
      const fromMax = from.scrollHeight - from.clientHeight;
      const toMax = to.scrollHeight - to.clientHeight;
      if (fromMax <= 0 || toMax <= 0) return;
      const ratio = from.scrollTop / fromMax;
      to.scrollTop = ratio * toMax;
    };

    const withLock = (fn: () => void) => {
      if (locked) return;
      locked = true;
      fn();
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        locked = false;
      });
    };

    const onEditorScroll = () => withLock(() => syncScroll(editorEl, previewEl));
    const onPreviewScroll = () => withLock(() => syncScroll(previewEl, editorEl));

    editorEl.addEventListener('scroll', onEditorScroll, { passive: true });
    previewEl.addEventListener('scroll', onPreviewScroll, { passive: true });
    return () => {
      editorEl.removeEventListener('scroll', onEditorScroll);
      previewEl.removeEventListener('scroll', onPreviewScroll);
      window.cancelAnimationFrame(rafId);
    };
  }, [editorMode, viewMode]);

  useEffect(() => {
    if (currentPath) return;
    clearEditorContext();
  }, [clearEditorContext, currentPath]);

  useEffect(() => {
    if (!currentPath) return;
    if (editorMode !== 'markdown') return;

    if (markdownSyncTimerRef.current) window.clearTimeout(markdownSyncTimerRef.current);
    markdownSyncTimerRef.current = window.setTimeout(() => {
      try {
        setEditorContext(
          computeEditorContextFromMarkdown({
            content,
            selection,
            windowParagraphs: editorContextWindowParagraphs,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setEditorContextSyncError(message);
      }
    }, editorContextDebounceMs);

    return () => {
      if (markdownSyncTimerRef.current) window.clearTimeout(markdownSyncTimerRef.current);
      markdownSyncTimerRef.current = null;
    };
  }, [
    content,
    currentPath,
    editorContextDebounceMs,
    editorContextWindowParagraphs,
    editorMode,
    selection,
    setEditorContext,
    setEditorContextSyncError,
  ]);

  useEffect(() => {
    scheduleTipTapSyncRef.current = (editor) => {
      if (!currentPath) return;
      if (editorMode !== 'richtext') return;

      if (tiptapSyncTimerRef.current) window.clearTimeout(tiptapSyncTimerRef.current);
      tiptapSyncTimerRef.current = window.setTimeout(() => {
        try {
          setEditorContext(computeEditorContextFromTipTap(editor, { windowParagraphs: editorContextWindowParagraphs }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setEditorContextSyncError(message);
        }
      }, editorContextDebounceMs);
    };

    return () => {
      if (tiptapSyncTimerRef.current) window.clearTimeout(tiptapSyncTimerRef.current);
      tiptapSyncTimerRef.current = null;
    };
  }, [currentPath, editorContextDebounceMs, editorContextWindowParagraphs, editorMode, setEditorContext, setEditorContextSyncError]);

  useEffect(() => {
    if (!currentPath) return;
    if (!isDirty) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      save().catch(() => undefined);
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    };
  }, [content, isDirty, save, currentPath]);

  useEffect(() => {
    if (!currentPath) return;
    if (!pendingJumpLine) return;

    if (editorMode !== 'markdown') {
      setEditorMode('markdown');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const offset = getOffsetForLine(useEditorStore.getState().content, pendingJumpLine);
    textarea.focus();
    textarea.setSelectionRange(offset, offset);

    const lineHeightRaw = window.getComputedStyle(textarea).lineHeight;
    const lineHeight = Number.parseFloat(lineHeightRaw);
    if (Number.isFinite(lineHeight) && lineHeight > 0) {
      textarea.scrollTop = Math.max(0, (pendingJumpLine - 1) * lineHeight);
    }

    consumeJumpToLine();
  }, [consumeJumpToLine, currentPath, editorMode, pendingJumpLine, setEditorMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPath) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      save().catch(() => undefined);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, save]);

  useEffect(() => {
    if (!currentPath) return;
    lastSnapshotPathRef.current = currentPath;
    lastSnapshotContentRef.current = useEditorStore.getState().content;

    const rawInterval = typeof window.writenow?.snapshotIntervalMs === 'number' ? window.writenow.snapshotIntervalMs : null;
    const intervalMs = rawInterval && rawInterval > 0 ? rawInterval : 5 * 60 * 1000;

    const intervalId = window.setInterval(() => {
      const state = useEditorStore.getState();
      if (!state.currentPath) return;
      if (state.currentPath !== lastSnapshotPathRef.current) return;

      const nextContent = state.content;
      if (nextContent === lastSnapshotContentRef.current) return;

      fileOps
        .snapshotWrite(state.currentPath, nextContent, 'auto')
        .then(() => {
          lastSnapshotContentRef.current = nextContent;
        })
        .catch(() => undefined);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [currentPath]);

  const tiptapEditor = useEditor({
    extensions: createEditorExtensions(),
    content: content || '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class:
          'outline-none min-h-[500px] leading-[1.8] text-[var(--text-primary)] selection:bg-[var(--accent-primary)]/30',
      },
    },
    onUpdate: ({ editor }) => {
      if (isProgrammaticTipTapUpdateRef.current) return;
      const markdown = editor.getMarkdown();
      if (markdown !== useEditorStore.getState().content) {
        setContent(markdown);
      }
      scheduleTipTapSyncRef.current?.(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      scheduleTipTapSyncRef.current?.(editor);
    },
  });

  useEffect(() => {
    if (!tiptapEditor) return;
    if (!currentPath) return;
    if (editorMode !== 'richtext') return;

    const nextContent = content || '';
    const currentMarkdown = tiptapEditor.getMarkdown();
    if (currentMarkdown === nextContent) return;

    isProgrammaticTipTapUpdateRef.current = true;
    tiptapEditor.commands.setContent(nextContent, { emitUpdate: false, contentType: 'markdown' });
    isProgrammaticTipTapUpdateRef.current = false;
    scheduleTipTapSyncRef.current?.(tiptapEditor);
  }, [content, currentPath, editorMode, tiptapEditor]);

  useEffect(() => {
    if (editorMode !== 'markdown') {
      setSelection(null);
    }
  }, [editorMode, setSelection]);

  if (!currentPath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]" data-testid="editor-empty">
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-tertiary)] mb-1">{t('editor.noFileSelected.title')}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">{t('editor.noFileSelected.hint')}</div>
        </div>
      </div>
    );
  }

  const renderPreview = () => (
    <div className="p-8 max-w-3xl mx-auto">
      <MarkdownPreview markdown={content} />
    </div>
  );

  const renderEditorBody = () => {
    if (editorMode === 'markdown') {
      return (
        <div className="flex-1 flex overflow-hidden">
          <div className="bg-[var(--bg-secondary)] wn-text-quaternary text-right pr-3 pl-3 py-3 text-[13px] leading-[1.6] font-mono select-none border-r border-[var(--border-subtle)] min-w-[50px]">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
          <div ref={editorScrollRef} className="flex-1 overflow-auto" data-testid="editor-scroll">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={(e) => {
                const start = e.currentTarget.selectionStart ?? 0;
                const end = e.currentTarget.selectionEnd ?? start;
                setSelection({ start, end });
              }}
              onKeyUp={(e) => {
                const start = e.currentTarget.selectionStart ?? 0;
                const end = e.currentTarget.selectionEnd ?? start;
                setSelection({ start, end });
              }}
              onMouseUp={(e) => {
                const start = e.currentTarget.selectionStart ?? 0;
                const end = e.currentTarget.selectionEnd ?? start;
                setSelection({ start, end });
              }}
              className="w-full h-full bg-transparent text-[var(--text-primary)] outline-none resize-none px-4 py-3 leading-[1.6] font-mono text-[13px]"
              placeholder={t('editor.placeholderMarkdown')}
              spellCheck={false}
            />
          </div>
        </div>
      );
    }

    return (
      <div ref={editorScrollRef} className="flex-1 overflow-auto" data-testid="editor-scroll">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EditorContent editor={tiptapEditor} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
      {!focusMode && (
        <div className="h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center">
          <div className="flex items-center gap-2 px-3 h-full bg-[var(--bg-tertiary)] border-r border-[var(--border-subtle)] min-w-0">
            <span className="text-[13px] text-[var(--text-secondary)] truncate">{currentPath}</span>
            {isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"
                title="未保存"
                aria-label="Unsaved changes"
              />
            )}
            <button
              onClick={() => closeFile()}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
              title="关闭"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1" />
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors mr-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {!focusMode && (
        <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorMode('markdown')}
              className={`h-6 px-2.5 rounded-md text-xs transition-colors ${
                editorMode === 'markdown'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              title={`Markdown（${getShortcutKeyLabel()}+S 保存）`}
            >
              Markdown
            </button>
            <button
              onClick={() => setEditorMode('richtext')}
              className={`h-6 px-2.5 rounded-md text-xs transition-colors ${
                editorMode === 'richtext'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              Rich Text
            </button>

            {editorMode === 'richtext' && (
              <>
                <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
                <Toolbar editor={tiptapEditor} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewModeChange('edit')}
              className={`h-6 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'edit'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => onViewModeChange('preview')}
              className={`h-6 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => onViewModeChange('split')}
              className={`h-6 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'split'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Columns className="w-3 h-3" />
              Split
            </button>
          </div>
        </div>
      )}

      <div ref={splitRootRef} className="flex-1 flex overflow-hidden" data-testid="editor-split-root">
        {viewMode === 'edit' && (
          <>
            {isLoading && <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--text-tertiary)]">正在加载...</div>}
            {!isLoading && loadError && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-[13px] text-[var(--text-tertiary)] mb-2">加载失败</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mb-3">{loadError}</div>
                  <button
                    onClick={() => closeFile()}
                    className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
            {!isLoading && !loadError && renderEditorBody()}
          </>
        )}

        {viewMode === 'preview' && (
          <div ref={previewScrollRef} className="flex-1 overflow-auto" data-testid="preview-scroll">
            {renderPreview()}
          </div>
        )}

        {viewMode === 'split' && (
          <>
            <div className="flex-none overflow-hidden" style={{ width: splitLeftPx > 0 ? splitLeftPx : EDITOR_SPLIT_MIN_PX }}>
              {renderEditorBody()}
            </div>
            <WnResizable
              direction="horizontal"
              sizePx={splitLeftPx > 0 ? splitLeftPx : EDITOR_SPLIT_MIN_PX}
              minPx={EDITOR_SPLIT_MIN_PX}
              maxPx={
                splitContainerWidth ? Math.max(EDITOR_SPLIT_MIN_PX, splitContainerWidth - EDITOR_SPLIT_MIN_PX) : 1600
              }
              ariaLabel="Resize editor/preview split"
              onSizePxChange={setSplitLeftPx}
            />
            <div ref={previewScrollRef} className="flex-1 overflow-auto" data-testid="preview-scroll">
              {renderPreview()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
