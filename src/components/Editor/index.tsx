import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, MoreHorizontal, Eye, Edit3, Columns } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';

import type { ViewMode } from '../../App';
import { fileOps } from '../../lib/ipc';
import { useEditorStore } from '../../stores/editorStore';
import { Toolbar } from './Toolbar';
import { createEditorExtensions } from './extensions/base';

interface EditorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  focusMode: boolean;
  onFocusModeToggle: () => void;
}

function getShortcutKeyLabel() {
  return window.writenow?.platform === 'darwin' ? '⌘' : 'Ctrl';
}

function formatSavedTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function Editor({ viewMode, onViewModeChange, focusMode, onFocusModeToggle }: EditorProps) {
  const currentPath = useEditorStore((s) => s.currentPath);
  const content = useEditorStore((s) => s.content);
  const editorMode = useEditorStore((s) => s.editorMode);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isLoading = useEditorStore((s) => s.isLoading);
  const loadError = useEditorStore((s) => s.loadError);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);

  const setContent = useEditorStore((s) => s.setContent);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const save = useEditorStore((s) => s.save);
  const closeFile = useEditorStore((s) => s.closeFile);

  const [lineCount, setLineCount] = useState(1);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastSnapshotContentRef = useRef<string>('');
  const lastSnapshotPathRef = useRef<string>('');
  const isProgrammaticTipTapUpdateRef = useRef(false);

  const saveLabel = useMemo(() => {
    if (saveStatus === 'saving') return '保存中...';
    if (saveStatus === 'error') return '保存失败';
    if (isDirty) return '未保存';
    return '已保存';
  }, [isDirty, saveStatus]);

  useEffect(() => {
    setLineCount(content.split('\n').length);
  }, [content]);

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
  }, [content, currentPath, editorMode, tiptapEditor]);

  if (!currentPath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-tertiary)] mb-1">No file selected</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">Select a file from the workflow</div>
        </div>
      </div>
    );
  }

  const renderPreview = () => (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="whitespace-pre-wrap text-[15px] text-[var(--text-secondary)] leading-[1.6]">{content}</div>
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
          <div className="flex-1 overflow-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-transparent text-[var(--text-primary)] outline-none resize-none px-4 py-3 leading-[1.6] font-mono text-[13px]"
              placeholder="Start typing in Markdown..."
              spellCheck={false}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto">
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
          <div className="flex items-center gap-2 px-3 h-full bg-[var(--bg-tertiary)] border-r border-[var(--border-subtle)]">
            <span className="text-[13px] text-[var(--text-secondary)]">{currentPath}</span>
            <button
              onClick={() => closeFile()}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
              title="关闭"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1" />
          <div className="text-[11px] text-[var(--text-tertiary)] mr-3">
            {saveLabel}
            {!isDirty && lastSavedAt ? ` · ${formatSavedTime(lastSavedAt)}` : ''}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={() => save().catch(() => undefined)}
                className="ml-2 text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-colors"
              >
                重试
              </button>
            )}
          </div>
          <button
            onClick={onFocusModeToggle}
            className="h-7 px-2 mr-1 rounded-md hover:bg-[var(--bg-hover)] text-xs text-[var(--text-tertiary)] transition-colors"
          >
            专注模式
          </button>
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

      <div className="flex-1 flex overflow-hidden">
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

        {viewMode === 'preview' && <div className="flex-1 overflow-auto">{renderPreview()}</div>}

        {viewMode === 'split' && (
          <>
            <div className="flex-1 border-r border-[var(--border-subtle)] overflow-hidden">{renderEditorBody()}</div>
            <div className="flex-1 overflow-auto">{renderPreview()}</div>
          </>
        )}
      </div>

      <div className="h-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center justify-between px-3 text-[11px] text-[var(--text-tertiary)]">
        <div className="flex gap-3">
          <span>{editorMode === 'markdown' ? 'Markdown - 等宽字体, 显示行号' : 'Rich Text - TipTap'}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex gap-3">
          <span>{saveLabel}</span>
          <span>Ln {lineCount}</span>
          <span>{content.length} chars</span>
        </div>
      </div>
    </div>
  );
}
