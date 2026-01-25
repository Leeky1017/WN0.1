/**
 * EditorPanel - 编辑器面板
 * Phase 2 实现 TipTap 编辑器
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';

import { invoke } from '@/lib/rpc';
import { useRpcConnection } from '@/lib/hooks';
import { useEditorFilesStore, useEditorModeStore, useStatusBarStore } from '@/stores';
import { computeTextStats } from '@/lib/editor/text-stats';
import { useLayoutApi } from '@/components/layout';

import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { FloatingToolbar } from '@/components/editor/FloatingToolbar';
import { ExportDialog } from '@/features/export/ExportDialog';

interface EditorPanelProps {
  filePath?: string;
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

  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

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

  const setDirty = useCallback(
    (dirty: boolean) => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      if (isDirtyRef.current === dirty) return;
      isDirtyRef.current = dirty;

      upsertFile(p, { isDirty: dirty, saveStatus: dirty ? 'unsaved' : 'saved' });
      setSaveStatus(dirty ? 'unsaved' : 'saved');
      setEditorTabDirty(p, dirty);
    },
    [filePath, setEditorTabDirty, setSaveStatus, upsertFile],
  );

  const setSavingStatus = useCallback(
    (status: 'saving' | 'error') => {
      const p = (filePath ?? '').trim();
      if (!p) return;
      upsertFile(p, { saveStatus: status });
      setSaveStatus(status);
    },
    [filePath, setSaveStatus, upsertFile],
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
      // Ensure status bar reflects the focused editor.
      const text = editor.state.doc.textContent;
      const stats = computeTextStats(text);
      setWordCount(stats.words);
      setCharCount(stats.chars);
    },
    [editor, setCharCount, setWordCount],
  );

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
        setSaveStatus('saved');

        const stats = computeTextStats(res.content);
        setWordCount(stats.words);
        setCharCount(stats.chars);
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

    const updateCursor = () => {
      const pos = editor.state.selection.$from.pos;
      const before = editor.state.doc.textBetween(0, pos, '\n', '\n');
      const lines = before.split('\n');
      const line = Math.max(1, lines.length);
      const column = Math.max(1, lines[lines.length - 1]?.length ?? 0) + 1;
      setCursorPosition({ line, column });
    };

    const updateStats = () => {
      const text = editor.state.doc.textContent;
      const stats = computeTextStats(text);
      setWordCount(stats.words);
      setCharCount(stats.chars);
    };

    const handleDomKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      void saveLatest('manual');
    };

    updateCursor();
    updateStats();
    editor.on('selectionUpdate', updateCursor);
    editor.on('update', updateStats);

    editor.view.dom.addEventListener('keydown', handleDomKeyDown);

    return () => {
      editor.off('selectionUpdate', updateCursor);
      editor.off('update', updateStats);
      editor.view.dom.removeEventListener('keydown', handleDomKeyDown);
    };
  }, [editor, saveLatest, setCharCount, setCursorPosition, setWordCount]);

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

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">请选择一个文件开始编辑</div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-editor)]">
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
              content={content}
              contentVersion={contentVersion}
              mode={mode}
              onEditorReady={handleEditorReady}
              onFocusChanged={handleFocusChanged}
              onMarkdownChanged={handleMarkdownChanged}
            />

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
