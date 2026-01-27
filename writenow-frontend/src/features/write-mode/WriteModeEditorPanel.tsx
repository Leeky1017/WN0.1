/**
 * WriteModeEditorPanel
 * Why: Host the TipTap editor and wire markdown changes to the Write Mode SSOT (autosave + status).
 */

import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';

import { TipTapEditor } from '@/components/editor';
import { useEditorModeStore } from '@/stores/editorModeStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useStatusBarStore } from '@/stores/statusBarStore';

import { useWriteModeStore } from './writeModeStore';

export function WriteModeEditorPanel() {
  const editorMode = useEditorModeStore((s) => s.mode);
  const isConnected = useStatusBarStore((s) => s.isConnected);

  const activeFilePath = useWriteModeStore((s) => s.activeFilePath);
  const markdown = useWriteModeStore((s) => s.markdown);
  const contentVersion = useWriteModeStore((s) => s.contentVersion);
  const updateMarkdown = useWriteModeStore((s) => s.updateMarkdown);
  const saveNow = useWriteModeStore((s) => s.saveNow);

  const setActiveEditor = useEditorRuntimeStore((s) => s.setActiveEditor);
  const clearForFile = useEditorRuntimeStore((s) => s.clearForFile);

  const [editor, setEditor] = useState<Editor | null>(null);

  const handleEditorReady = useCallback((next: Editor | null) => {
    setEditor(next);
  }, []);

  useEffect(() => {
    if (!activeFilePath) return;
    setActiveEditor(activeFilePath, editor);
    return () => {
      clearForFile(activeFilePath);
    };
  }, [activeFilePath, clearForFile, editor, setActiveEditor]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
      if (!isSave) return;
      if (!activeFilePath) return;
      event.preventDefault();
      void saveNow('manual').catch(() => {
        // Why: errors are surfaced via the unified save indicator; keep keybinding best-effort.
      });
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFilePath, saveNow]);

  const handleMarkdownChanged = useCallback(
    (next: string) => {
      if (!activeFilePath) return;
      updateMarkdown(next);
    },
    [activeFilePath, updateMarkdown],
  );

  if (!activeFilePath) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-[var(--fg-muted)]">
        从左侧选择或新建一个文档开始写作
      </div>
    );
  }

  const readOnly = !isConnected;

  return (
    <div className="h-full w-full relative">
      {!isConnected && (
        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md text-[11px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--fg-muted)]">
          后端未连接：只读（不可保存）
        </div>
      )}

      <TipTapEditor
        content={markdown}
        contentVersion={contentVersion}
        mode={editorMode}
        readOnly={readOnly}
        onEditorReady={handleEditorReady}
        onFocusChanged={() => {
          // Why: focus state is consumed by higher-level UI (future Focus/Zen); keep editor thin here.
        }}
        onMarkdownChanged={handleMarkdownChanged}
      />
    </div>
  );
}

export default WriteModeEditorPanel;

