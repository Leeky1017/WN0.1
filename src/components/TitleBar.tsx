import React, { useEffect, useRef, useState } from 'react';
import { Minus, Square, X, PenLine, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, Focus } from 'lucide-react';

import { useTranslation } from 'react-i18next';

import { exportOps, IpcError } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useEditorStore } from '../stores/editorStore';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';

interface TitleBarProps {
  focusMode: boolean;
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  onToggleSidebar: () => void;
  onToggleAIPanel: () => void;
  onToggleFocusMode: () => void;
}

export function TitleBar({
  focusMode,
  sidebarOpen,
  aiPanelOpen,
  onToggleSidebar,
  onToggleAIPanel,
  onToggleFocusMode,
}: TitleBarProps) {
  const { t } = useTranslation();
  const api = window.writenow;
  const currentPath = useEditorStore((s) => s.currentPath);
  const content = useEditorStore((s) => s.content);

  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<null | 'markdown' | 'docx' | 'pdf'>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  function getTitle() {
    const raw = typeof currentPath === 'string' ? currentPath : '';
    if (!raw) return '';
    return raw.toLowerCase().endsWith('.md') ? raw.slice(0, -3) : raw;
  }

  function showNotice(message: string) {
    setExportNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setExportNotice(null), 4500);
  }

  async function handleExport(format: 'markdown' | 'docx' | 'pdf') {
    if (!currentPath) {
      showNotice(t('export.noDocument'));
      return;
    }

    setExporting(format);
    try {
      const title = getTitle() || 'Untitled';
      const result =
        format === 'markdown'
          ? await exportOps.markdown(title, content)
          : format === 'docx'
            ? await exportOps.docx(title, content)
            : await exportOps.pdf(title, content);
      showNotice(t('export.success', { path: result.path }));
    } catch (error) {
      const message =
        error instanceof IpcError
          ? toUserMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : String(error);
      showNotice(t('export.failed', { error: message }));
    } finally {
      setExporting(null);
    }
  }

  const WindowControls = (
    <div className="flex items-center wn-no-drag">
      <button
        type="button"
        onClick={() => api?.minimize?.()}
        className="wn-titlebar-btn"
        aria-label="Minimize window"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => api?.maximize?.()}
        className="wn-titlebar-btn"
        aria-label="Maximize window"
        title="Maximize"
      >
        <Square className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => api?.close?.()}
        className="wn-titlebar-btn wn-titlebar-close"
        aria-label="Close window"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="h-9 flex items-center justify-between px-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] wn-drag">
      <div className="flex items-center gap-2 min-w-0 wn-no-drag">
        <div className="flex items-center gap-2 px-2 h-7 rounded-md hover:bg-[var(--bg-hover)] transition-colors">
          <PenLine className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-[13px] font-medium text-[var(--text-primary)]">{t('app.title')}</span>
        </div>
        {!focusMode && (
          <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            <DropdownMenu
              open={fileMenuOpen}
              onOpenChange={setFileMenuOpen}
              side="bottom"
              trigger={
                <button type="button" className="wn-titlebar-pill" title={t('app.menu.file')}>
                  {t('app.menu.file')}
                </button>
              }
            >
              <DropdownMenuItem
                disabled={!currentPath || exporting !== null}
                onClick={() => {
                  setFileMenuOpen(false);
                  handleExport('markdown').catch(() => undefined);
                }}
              >
                {t('export.exportMarkdown')}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!currentPath || exporting !== null}
                onClick={() => {
                  setFileMenuOpen(false);
                  handleExport('docx').catch(() => undefined);
                }}
              >
                {t('export.exportWord')}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!currentPath || exporting !== null}
                onClick={() => {
                  setFileMenuOpen(false);
                  handleExport('pdf').catch(() => undefined);
                }}
              >
                {t('export.exportPdf')}
              </DropdownMenuItem>
              {exporting && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled onClick={() => undefined}>
                    {exporting === 'markdown'
                      ? `${t('common.export')} ${t('export.markdown')}…`
                      : exporting === 'docx'
                        ? `${t('common.export')} ${t('export.word')}…`
                        : `${t('common.export')} ${t('export.pdf')}…`}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenu>
            <button type="button" className="wn-titlebar-pill" title={t('app.menu.edit')}>
              {t('app.menu.edit')}
            </button>
            <button type="button" className="wn-titlebar-pill" title={t('app.menu.view')}>
              {t('app.menu.view')}
            </button>
            <button type="button" className="wn-titlebar-pill" title={t('app.menu.publish')}>
              {t('app.menu.publish')}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 wn-no-drag">
        {!focusMode && (
          <>
            <button
              type="button"
              onClick={onToggleFocusMode}
              className="wn-icon-btn"
              aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
              title="Focus"
            >
              <Focus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleSidebar}
              className="wn-icon-btn"
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              title="Sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleAIPanel}
              className="wn-icon-btn"
              aria-label={aiPanelOpen ? 'Hide AI panel' : 'Show AI panel'}
              title="AI"
            >
              {aiPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
            <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
          </>
        )}
        {WindowControls}
      </div>

      {exportNotice && (
        <div className="fixed top-12 right-4 wn-elevated rounded-md px-3 py-2 text-[12px] text-[var(--text-secondary)] shadow-lg">
          {exportNotice}
        </div>
      )}
    </div>
  );
}
