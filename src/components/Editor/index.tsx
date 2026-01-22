import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import type { ViewMode } from '../../App';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import { fileOps } from '../../lib/ipc';
import { useEditorContextStore } from '../../stores/editorContextStore';
import { useEditorStore } from '../../stores/editorStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { MarkdownPreview } from './MarkdownPreview';
import { TabToolbar } from './TabToolbar';
import { createEditorExtensions } from './extensions/base';
import { computeEditorContextFromMarkdown, computeEditorContextFromTipTap } from './editor-context-sync';
import { applyParagraphFocus, clearParagraphFocus } from './modes/focus';
import { applyTypewriterToTextarea, applyTypewriterToTipTap } from './modes/typewriter';
import { WnResizable } from '../wn';

interface EditorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  focusMode: boolean;
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

function getLineForOffset(content: string, offset: number) {
  const max = content.length;
  const safeOffset = Number.isFinite(offset) ? Math.min(max, Math.max(0, Math.floor(offset))) : 0;
  let line = 1;
  for (let i = 0; i < safeOffset; i += 1) {
    if (content[i] === '\n') line += 1;
  }
  return line;
}

function normalizeJumpRange(range: { start: number; end: number }, contentLength: number) {
  const startRaw = Number.isFinite(range.start) ? range.start : 0;
  const endRaw = Number.isFinite(range.end) ? range.end : startRaw;
  const start = Math.min(contentLength, Math.max(0, Math.floor(startRaw)));
  const end = Math.min(contentLength, Math.max(0, Math.floor(endRaw)));
  return end >= start ? { start, end } : { start: end, end: start };
}

const EDITOR_SPLIT_STORAGE_KEY = 'WN_EDITOR_SPLIT_LEFT_PX_V1';
const EDITOR_SPLIT_MIN_PX = 360;

export function Editor({ viewMode, onViewModeChange, focusMode }: EditorProps) {
  const { t } = useTranslation();
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const activeTab = useEditorStore((s) => (s.activeTabId ? s.tabStateById[s.activeTabId] ?? null : null));

  const currentPath = activeTab?.path ?? null;
  const content = activeTab?.content ?? '';
  const editorMode = activeTab?.editorMode ?? 'markdown';
  const isDirty = activeTab?.isDirty ?? false;
  const isLoading = activeTab?.isLoading ?? false;
  const loadError = activeTab?.loadError ?? null;
  const selection = activeTab?.selection ?? null;
  const pendingJumpLine = activeTab?.pendingJumpLine ?? null;
  const pendingJumpRange = activeTab?.pendingJumpRange ?? null;

  const setContent = useEditorStore((s) => s.setContent);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const save = useEditorStore((s) => s.save);
  const requestSave = useEditorStore((s) => s.requestSave);
  const closeFile = useEditorStore((s) => s.closeFile);
  const consumeJumpToLine = useEditorStore((s) => s.consumeJumpToLine);
  const consumeJumpToRange = useEditorStore((s) => s.consumeJumpToRange);
  const setTabScroll = useEditorStore((s) => s.setTabScroll);

  const typewriterEnabled = usePreferencesStore((s) => s.flow.typewriterEnabled);
  const typewriterTolerancePx = usePreferencesStore((s) => s.flow.typewriterTolerancePx);
  const paragraphFocusEnabled = usePreferencesStore((s) => s.flow.paragraphFocusEnabled);
  const paragraphFocusDimOpacity = usePreferencesStore((s) => s.flow.paragraphFocusDimOpacity);

  const [lineCount, setLineCount] = useState(1);
  const lastSnapshotContentRef = useRef<string>('');
  const lastSnapshotPathRef = useRef<string>('');
  const isProgrammaticTipTapUpdateRef = useRef(false);
  const typewriterRafRef = useRef<number | null>(null);
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

  useDebouncedSave({
    enabled: Boolean(currentPath),
    isDirty,
    debounceMs: 2000,
    trigger: content,
    requestSave,
  });

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
    const editorEl = editorMode === 'markdown' ? textareaRef.current : editorScrollRef.current;
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
    if (!activeTabId) return;
    const scroll = useEditorStore.getState().scrollMap[activeTabId] ?? { editorScrollTop: 0, previewScrollTop: 0 };
    const editorEl = editorMode === 'markdown' ? textareaRef.current : editorScrollRef.current;
    if (editorEl) editorEl.scrollTop = scroll.editorScrollTop;
    if (previewScrollRef.current) previewScrollRef.current.scrollTop = scroll.previewScrollTop;
  }, [activeTabId, editorMode, viewMode]);

  useEffect(() => {
    if (!activeTabId) return;
    const editorEl = editorMode === 'markdown' ? textareaRef.current : editorScrollRef.current;
    const previewEl = previewScrollRef.current;
    if (!editorEl && !previewEl) return;

    let rafId = 0;
    const schedulePersist = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setTabScroll(activeTabId, {
          editorScrollTop: editorEl?.scrollTop ?? 0,
          previewScrollTop: previewEl?.scrollTop ?? 0,
        });
      });
    };

    editorEl?.addEventListener('scroll', schedulePersist, { passive: true });
    previewEl?.addEventListener('scroll', schedulePersist, { passive: true });
    schedulePersist();

    return () => {
      editorEl?.removeEventListener('scroll', schedulePersist);
      previewEl?.removeEventListener('scroll', schedulePersist);
      window.cancelAnimationFrame(rafId);
    };
  }, [activeTabId, editorMode, setTabScroll, viewMode]);

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
    if (!pendingJumpLine) return;

    if (editorMode !== 'markdown') {
      setEditorMode('markdown');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const state = useEditorStore.getState();
    const activeId = state.activeTabId;
    const activeContent = activeId ? state.tabStateById[activeId]?.content ?? '' : '';
    const offset = getOffsetForLine(activeContent, pendingJumpLine);
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
    if (!currentPath) return;
    if (!pendingJumpRange) return;

    if (editorMode !== 'markdown') {
      setEditorMode('markdown');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const state = useEditorStore.getState();
    const activeId = state.activeTabId;
    const activeContent = activeId ? state.tabStateById[activeId]?.content ?? '' : '';
    const { start, end } = normalizeJumpRange(pendingJumpRange, activeContent.length);
    textarea.focus();
    textarea.setSelectionRange(start, end);
    setSelection({ start, end });

    const line = getLineForOffset(activeContent, start);
    const lineHeightRaw = window.getComputedStyle(textarea).lineHeight;
    const lineHeight = Number.parseFloat(lineHeightRaw);
    if (Number.isFinite(lineHeight) && lineHeight > 0) {
      textarea.scrollTop = Math.max(0, (line - 1) * lineHeight);
    }

    consumeJumpToRange();
  }, [consumeJumpToRange, currentPath, editorMode, pendingJumpRange, setEditorMode, setSelection]);

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
    if (!activeTabId) return;
    lastSnapshotPathRef.current = currentPath;
    lastSnapshotContentRef.current = useEditorStore.getState().tabStateById[activeTabId]?.content ?? '';

    const rawInterval = typeof window.writenow?.snapshotIntervalMs === 'number' ? window.writenow.snapshotIntervalMs : null;
    const intervalMs = rawInterval && rawInterval > 0 ? rawInterval : 5 * 60 * 1000;

    const intervalId = window.setInterval(() => {
      const state = useEditorStore.getState();
      const activeId = state.activeTabId;
      if (!activeId) return;
      const tab = state.tabStateById[activeId];
      if (!tab) return;
      if (tab.path !== lastSnapshotPathRef.current) return;

      const nextContent = tab.content;
      if (nextContent === lastSnapshotContentRef.current) return;

      fileOps
        .snapshotWrite(tab.path, nextContent, 'auto')
        .then(() => {
          lastSnapshotContentRef.current = nextContent;
        })
        .catch(() => undefined);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [activeTabId, currentPath]);

  const scheduleTypewriter = useCallback((editorOverride: Parameters<typeof applyTypewriterToTipTap>[0] | null = null) => {
    if (!typewriterEnabled) return;
    if (typewriterRafRef.current) return;

    typewriterRafRef.current = window.requestAnimationFrame(() => {
      typewriterRafRef.current = null;
      const tolerancePx = typewriterTolerancePx;

      if (editorMode === 'markdown') {
        const textarea = textareaRef.current;
        if (!textarea) return;
        applyTypewriterToTextarea(textarea, { tolerancePx });
        return;
      }

      const container = editorScrollRef.current;
      const editor = editorOverride;
      if (!container || !editor) return;
      applyTypewriterToTipTap(editor, container, { tolerancePx });
    });
  }, [editorMode, typewriterEnabled, typewriterTolerancePx]);

  useEffect(() => {
    return () => {
      if (typewriterRafRef.current) window.cancelAnimationFrame(typewriterRafRef.current);
      typewriterRafRef.current = null;
    };
  }, []);

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
      const state = useEditorStore.getState();
      const activeId = state.activeTabId;
      const activeContent = activeId ? state.tabStateById[activeId]?.content ?? '' : '';
      if (markdown !== activeContent) {
        setContent(markdown);
      }
      scheduleTipTapSyncRef.current?.(editor);
      scheduleTypewriter(editor);
      if (paragraphFocusEnabled) applyParagraphFocus(editor, { dimOpacity: paragraphFocusDimOpacity });
    },
    onSelectionUpdate: ({ editor }) => {
      scheduleTipTapSyncRef.current?.(editor);
      scheduleTypewriter(editor);
      if (paragraphFocusEnabled) applyParagraphFocus(editor, { dimOpacity: paragraphFocusDimOpacity });
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
    if (!tiptapEditor) return;
    if (editorMode !== 'richtext' || !paragraphFocusEnabled) {
      clearParagraphFocus(tiptapEditor);
      return;
    }

    applyParagraphFocus(tiptapEditor, { dimOpacity: paragraphFocusDimOpacity });
    return () => clearParagraphFocus(tiptapEditor);
  }, [editorMode, paragraphFocusDimOpacity, paragraphFocusEnabled, tiptapEditor]);

  useEffect(() => {
    if (!typewriterEnabled) return;
    scheduleTypewriter(tiptapEditor);
  }, [activeTabId, editorMode, scheduleTypewriter, tiptapEditor, typewriterEnabled, typewriterTolerancePx]);

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
          <div ref={editorScrollRef} className="flex-1 overflow-hidden">
            <textarea
              ref={textareaRef}
              data-testid="editor-scroll"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                scheduleTypewriter();
              }}
              onSelect={(e) => {
                const start = e.currentTarget.selectionStart ?? 0;
                const end = e.currentTarget.selectionEnd ?? start;
                setSelection({ start, end });
                scheduleTypewriter();
              }}
              onKeyUp={(e) => {
                const start = e.currentTarget.selectionStart ?? 0;
                const end = e.currentTarget.selectionEnd ?? start;
                setSelection({ start, end });
                scheduleTypewriter();
              }}
              onMouseUp={(e) => {
                const start = e.currentTarget.selectionStart ?? 0;
                const end = e.currentTarget.selectionEnd ?? start;
                setSelection({ start, end });
                scheduleTypewriter();
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
        <TabToolbar
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          editorMode={editorMode}
          onEditorModeChange={setEditorMode}
          richtextEditor={tiptapEditor}
        />
      )}

      <div ref={splitRootRef} className="flex-1 flex overflow-hidden" data-testid="editor-split-root">
        {viewMode === 'edit' && (
          <>
            {isLoading && (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--text-tertiary)]">
                {t('common.loading')}
              </div>
            )}
            {!isLoading && loadError && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-[13px] text-[var(--text-tertiary)] mb-2">{t('editor.loadFailed')}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mb-3">{loadError}</div>
                  <button
                    onClick={() => closeFile()}
                    className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                  >
                    {t('common.close')}
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
              ariaLabel={t('editor.split.resizeAria')}
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
