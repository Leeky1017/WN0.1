/**
 * EditorPanel - 编辑器面板
 * Phase 2 实现 TipTap 编辑器
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Editor } from '@tiptap/core';

import { invoke } from '@/lib/rpc';
import { useRpcConnection } from '@/lib/hooks';
import { useEditorFilesStore } from '@/stores/editorFilesStore';
import { useEditorModeStore } from '@/stores/editorModeStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useStatusBarStore } from '@/stores/statusBarStore';
import { computeTextStats } from '@/lib/editor/text-stats';
import { useLayoutApi } from '@/components/layout';
import { Button, Input } from '@/components/ui';

import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { FloatingToolbar } from '@/components/editor/FloatingToolbar';
import { ExportDialog } from '@/features/export/ExportDialog';
import { useAISkill } from '@/features/ai-panel/useAISkill';

interface EditorPanelProps {
  filePath?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned a non-string result'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

function findFirstImageFile(files: FileList | null | undefined): File | null {
  if (!files || files.length === 0) return null;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) return file;
  }
  return null;
}

function insertImage(editor: Editor, src: string, alt?: string, pos?: number): void {
  type ImageChain = {
    focus: () => ImageChain;
    setTextSelection: (pos: number) => ImageChain;
    setImage: (opts: { src: string; alt?: string }) => ImageChain;
    run: () => void;
  };

  const chain = editor.chain().focus() as unknown as ImageChain;
  if (typeof pos === 'number') {
    chain.setTextSelection(pos);
  }
  chain.setImage({ src, ...(alt ? { alt } : {}) }).run();
}

/**
 * 编辑器面板组件
 * Why: Render a TipTap-based editor for a single file tab (FlexLayout provides multi-tab UI).
 */
export function EditorPanel({ filePath }: EditorPanelProps) {
  const { isConnected } = useRpcConnection({ autoConnect: false });
  const { focusAiPanel, setEditorTabDirty } = useLayoutApi();

  const mode = useEditorModeStore((s) => s.mode);
  const setMode = useEditorModeStore((s) => s.setDefaultMode);

  const upsertFile = useEditorFilesStore((s) => s.upsert);

  const setSaveStatus = useStatusBarStore((s) => s.setSaveStatus);
  const setCursorPosition = useStatusBarStore((s) => s.setCursorPosition);
  const setWordCount = useStatusBarStore((s) => s.setWordCount);
  const setCharCount = useStatusBarStore((s) => s.setCharCount);

  const setActiveEditor = useEditorRuntimeStore((s) => s.setActiveEditor);
  const setSelection = useEditorRuntimeStore((s) => s.setSelection);
  const clearForFile = useEditorRuntimeStore((s) => s.clearForFile);

  const { sendMessage } = useAISkill();

  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [inlineAiOpen, setInlineAiOpen] = useState(false);
  const [inlineAiInput, setInlineAiInput] = useState('');
  const [inlineAiPosition, setInlineAiPosition] = useState<{ x: number; y: number } | null>(null);

  const inlineAiInputRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState('');
  const [contentVersion, setContentVersion] = useState(0);

  const latestMarkdownRef = useRef('');
  const lastSavedMarkdownRef = useRef('');
  const autosaveTimeoutRef = useRef<number | null>(null);
  const snapshotIntervalRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const isDirtyRef = useRef(false);
  const editorViewportRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => {
    const p = (filePath ?? '').trim();
    if (!p) return '未命名';
    return p.split('/').pop() || p;
  }, [filePath]);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  }, []);

  const isEditorActive = useCallback(
    (path: string): boolean => {
      const normalized = path.trim();
      if (!normalized) return false;

      const runtime = useEditorRuntimeStore.getState();
      if (runtime.activeFilePath === normalized) return true;

      // Why: Focus can precede `activeFilePath` initialization (e.g. tab auto-focus). Treat the focused editor as active
      // so StatusBar + AI selection stay in sync with user input.
      return Boolean(editor?.view?.hasFocus());
    },
    [editor],
  );

  const setDirty = useCallback(
    (dirty: boolean) => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      if (isDirtyRef.current === dirty) return;
      isDirtyRef.current = dirty;

      upsertFile(p, { isDirty: dirty, saveStatus: dirty ? 'unsaved' : 'saved' });
      if (isEditorActive(p)) {
        setSaveStatus(dirty ? 'unsaved' : 'saved');
      }
      setEditorTabDirty(p, dirty);
    },
    [filePath, isEditorActive, setEditorTabDirty, setSaveStatus, upsertFile],
  );

  const setSavingStatus = useCallback(
    (status: 'saving' | 'error') => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      upsertFile(p, { saveStatus: status });
      if (isEditorActive(p)) {
        setSaveStatus(status);
      }
    },
    [filePath, isEditorActive, setSaveStatus, upsertFile],
  );

  const saveLatest = useCallback(
    async (reason: 'auto' | 'manual') => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      if (!isConnected) {
        setSaveError('未连接到后端，无法保存');
        setSavingStatus('error');
        return;
      }

      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return;
      }

      const markdownToSave = latestMarkdownRef.current;
      isSavingRef.current = true;
      setSaveError(null);
      setSavingStatus('saving');

      try {
        await invoke('file:write', { path: p, content: markdownToSave });
        lastSavedMarkdownRef.current = markdownToSave;

        const hasNewChanges = latestMarkdownRef.current !== markdownToSave;
        if (!hasNewChanges) {
          setDirty(false);
        } else {
          setDirty(true);
        }

        // Optional snapshot signal (best-effort).
        if (reason === 'manual') {
          void invoke('file:snapshot:write', { path: p, content: markdownToSave, reason: 'manual' }).catch((error) => {
            console.warn('[Editor] snapshot write failed:', error);
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败';
        setSaveError(message);
        setDirty(true);
        setSavingStatus('error');
      } finally {
        isSavingRef.current = false;
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          void saveLatest('auto');
        }
      }
    },
    [filePath, isConnected, setDirty, setSavingStatus],
  );

  const scheduleAutosave = useCallback(() => {
    clearAutosaveTimer();
    autosaveTimeoutRef.current = window.setTimeout(() => {
      void saveLatest('auto');
    }, 2000);
  }, [clearAutosaveTimer, saveLatest]);

  const handleMarkdownChanged = useCallback(
    (markdown: string) => {
      latestMarkdownRef.current = markdown;
      setDirty(markdown !== lastSavedMarkdownRef.current);
      if (markdown !== lastSavedMarkdownRef.current) {
        scheduleAutosave();
      }
    },
    [scheduleAutosave, setDirty],
  );

  const handleEditorReady = useCallback((next: Editor | null) => {
    setEditor(next);
  }, []);

  const handleFocusChanged = useCallback(
    (focused: boolean) => {
      if (!focused || !editor) return;
      const p = (filePath ?? '').trim();
      if (p) setActiveEditor(p, editor);
      if (p) {
        const fileState = useEditorFilesStore.getState().byPath[p];
        if (fileState?.saveStatus) setSaveStatus(fileState.saveStatus);
      }
      // Ensure status bar reflects the focused editor.
      const text = editor.state.doc.textContent;
      const stats = computeTextStats(text);
      setWordCount(stats.words);
      setCharCount(stats.chars);
    },
    [editor, filePath, setActiveEditor, setCharCount, setSaveStatus, setWordCount],
  );

  /**
   * Why: Inline AI must appear near the current cursor without leaving the editor context.
   */
  const openInlineAi = useCallback(() => {
    if (!editor) return;
    const container = editorViewportRef.current;
    if (!container) return;

    try {
      const pos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(pos);
      const rect = container.getBoundingClientRect();
      setInlineAiPosition({
        x: Math.max(12, coords.left - rect.left),
        y: Math.max(12, coords.top - rect.top - 12),
      });
      setInlineAiInput('');
      setInlineAiOpen(true);
    } catch (error) {
      console.warn('[InlineAI] failed to open:', error);
    }
  }, [editor]);

  /**
   * Why: Inline AI should forward requests to the shared AI pipeline and focus the panel for output.
   */
  const handleInlineSend = useCallback(async () => {
    await sendMessage(inlineAiInput);
    setInlineAiOpen(false);
    setInlineAiInput('');
    focusAiPanel();
  }, [focusAiPanel, inlineAiInput, sendMessage]);

  /**
   * Why: Inline AI needs local key handling (Enter to send, Esc to close) without bubbling to the editor.
   */
  const handleInlineKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setInlineAiOpen(false);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleInlineSend();
      }
    },
    [handleInlineSend],
  );

  useEffect(() => {
    if (!inlineAiOpen) return;
    inlineAiInputRef.current?.focus();
  }, [inlineAiOpen]);

  // Load file content when filePath changes.
  useEffect(() => {
    const p = (filePath ?? '').trim();
    if (!p) return;
    if (!isConnected) return;

    let canceled = false;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);

    void invoke('file:read', { path: p })
      .then((res) => {
        if (canceled) return;
        setContent(res.content);
        setContentVersion((v) => v + 1);
        latestMarkdownRef.current = res.content;
        lastSavedMarkdownRef.current = res.content;
        isDirtyRef.current = false;
        setEditorTabDirty(p, false);
        upsertFile(p, { isDirty: false, saveStatus: 'saved' });
        if (useEditorRuntimeStore.getState().activeFilePath === p) {
          setSaveStatus('saved');
        }

        const stats = computeTextStats(res.content);
        if (useEditorRuntimeStore.getState().activeFilePath === p) {
          setWordCount(stats.words);
          setCharCount(stats.chars);
        }
      })
      .catch((err) => {
        if (canceled) return;
        setLoadError(err instanceof Error ? err.message : '打开文件失败');
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [filePath, isConnected, reloadToken, setCharCount, setEditorTabDirty, setSaveStatus, setWordCount, upsertFile]);

  // Bind editor-level listeners (cursor position, stats, manual save shortcut).
  useEffect(() => {
    if (!editor) return;

    const isActiveForStatusBar = (): boolean => {
      const p = (filePath ?? '').trim();
      if (!p) return false;
      if (useEditorRuntimeStore.getState().activeFilePath === p) return true;
      return editor.view.hasFocus();
    };

    const updateCursor = () => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      if (!isActiveForStatusBar()) return;
      const pos = editor.state.selection.$from.pos;
      const before = editor.state.doc.textBetween(0, pos, '\n', '\n');
      const lines = before.split('\n');
      const line = Math.max(1, lines.length);
      const column = Math.max(1, lines[lines.length - 1]?.length ?? 0) + 1;
      setCursorPosition({ line, column });
    };

    const updateSelection = () => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      if (!isActiveForStatusBar()) return;
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelection(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, '\n', '\n');
      setSelection({ filePath: p, from, to, text, updatedAt: Date.now() });
    };

    const updateStats = () => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      if (!isActiveForStatusBar()) return;
      const text = editor.state.doc.textContent;
      const stats = computeTextStats(text);
      setWordCount(stats.words);
      setCharCount(stats.chars);
    };

    const handleDomKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        void saveLatest('manual');
      }
      if (key === 'k' && !e.shiftKey) {
        e.preventDefault();
        openInlineAi();
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      const file = findFirstImageFile(event.clipboardData?.files);
      if (!file) return;

      event.preventDefault();
      void readFileAsDataUrl(file)
        .then((src) => insertImage(editor, src, file.name))
        .catch((error) => {
          console.warn('[Editor] paste image failed:', error);
        });
    };

    const handleDrop = (event: DragEvent) => {
      const file = findFirstImageFile(event.dataTransfer?.files);
      if (!file) return;

      event.preventDefault();
      const coords = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      const pos = coords?.pos;
      void readFileAsDataUrl(file)
        .then((src) => insertImage(editor, src, file.name, typeof pos === 'number' ? pos : undefined))
        .catch((error) => {
          console.warn('[Editor] drop image failed:', error);
        });
    };

    updateCursor();
    updateSelection();
    updateStats();
    editor.on('selectionUpdate', updateCursor);
    editor.on('selectionUpdate', updateSelection);
    editor.on('update', updateStats);

    editor.view.dom.addEventListener('keydown', handleDomKeyDown);
    editor.view.dom.addEventListener('paste', handlePaste);
    editor.view.dom.addEventListener('drop', handleDrop);

    return () => {
      editor.off('selectionUpdate', updateCursor);
      editor.off('selectionUpdate', updateSelection);
      editor.off('update', updateStats);
      editor.view.dom.removeEventListener('keydown', handleDomKeyDown);
      editor.view.dom.removeEventListener('paste', handlePaste);
      editor.view.dom.removeEventListener('drop', handleDrop);
    };
  }, [editor, filePath, openInlineAi, saveLatest, setCharCount, setCursorPosition, setSelection, setWordCount]);

  // Best-effort periodic snapshots for recovery.
  useEffect(() => {
    const p = (filePath ?? '').trim();
    if (!p) return;
    if (!isConnected) return;

    if (snapshotIntervalRef.current !== null) {
      window.clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }

    snapshotIntervalRef.current = window.setInterval(() => {
      const contentForSnapshot = latestMarkdownRef.current;
      if (!contentForSnapshot) return;
      void invoke('file:snapshot:write', { path: p, content: contentForSnapshot, reason: 'auto' }).catch((error) => {
        console.warn('[Editor] snapshot write failed:', error);
      });
    }, 5 * 60 * 1000);

    return () => {
      if (snapshotIntervalRef.current !== null) {
        window.clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
    };
  }, [filePath, isConnected]);

  // Cleanup timers on unmount.
  useEffect(() => clearAutosaveTimer, [clearAutosaveTimer]);

  // Re-apply current markdown when switching richtext/markdown mode.
  useEffect(() => {
    const p = (filePath ?? '').trim();
    if (!p) return;
    setContentVersion((v) => v + 1);
  }, [filePath, mode]);

  useEffect(() => {
    const p = (filePath ?? '').trim();
    if (!p) return;
    return () => clearForFile(p);
  }, [clearForFile, filePath]);

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">请选择一个文件开始编辑</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-editor)]" data-testid="editor-panel">
      <EditorToolbar
        editor={editor}
        mode={mode}
        onModeChange={setMode}
        onRequestExport={() => setExportOpen(true)}
      />

      <div className="flex-1 relative overflow-hidden" ref={editorViewportRef}>
        {!isConnected ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)]">未连接到后端</div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)]">加载中…</div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm text-[var(--color-error)]">{loadError}</div>
            <button
              type="button"
              className="text-xs text-[var(--accent)] hover:underline"
              onClick={() => {
                setReloadToken((v) => v + 1);
              }}
            >
              重试
            </button>
          </div>
        ) : (
          <>
            <TipTapEditor
              content={latestMarkdownRef.current || content}
              contentVersion={contentVersion}
              mode={mode}
              onEditorReady={handleEditorReady}
              onFocusChanged={handleFocusChanged}
              onMarkdownChanged={handleMarkdownChanged}
            />

            {inlineAiOpen && inlineAiPosition && (
              <div
                className="absolute z-30 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] p-2 shadow-xl"
                style={{
                  left: `${inlineAiPosition.x}px`,
                  top: `${inlineAiPosition.y}px`,
                  transform: 'translateY(-100%)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Input
                    ref={inlineAiInputRef}
                    value={inlineAiInput}
                    placeholder="内联 AI 指令…"
                    onChange={(event) => setInlineAiInput(event.target.value)}
                    onKeyDown={handleInlineKeyDown}
                  />
                  <Button type="button" size="sm" onClick={() => void handleInlineSend()}>
                    发送
                  </Button>
                </div>
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">Enter 发送 · Esc 关闭</div>
              </div>
            )}

            <FloatingToolbar editor={editor} containerEl={editorViewportRef.current} onRequestFocusAi={focusAiPanel} />
          </>
        )}
      </div>

      {saveError && (
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] text-xs text-[var(--color-error)] flex items-center justify-between">
          <span>{saveError}</span>
          <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => void saveLatest('manual')}>
            重试保存
          </button>
        </div>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        markdown={latestMarkdownRef.current || content}
        html={editor?.getHTML() ?? ''}
        text={editor?.getText() ?? ''}
      />
    </div>
  );
}

export default EditorPanel;
