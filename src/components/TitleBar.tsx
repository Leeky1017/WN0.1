import React from 'react';
import { Minus, Square, X, PenLine, PanelRightOpen, PanelRightClose, BarChart3, Focus } from 'lucide-react';

interface TitleBarProps {
  focusMode: boolean;
  aiPanelOpen: boolean;
  statsBarOpen: boolean;
  onToggleAIPanel: () => void;
  onToggleStatsBar: () => void;
  onToggleFocusMode: () => void;
}

export function TitleBar({
  focusMode,
  aiPanelOpen,
  statsBarOpen,
  onToggleAIPanel,
  onToggleStatsBar,
  onToggleFocusMode,
}: TitleBarProps) {
  const api = window.writenow;

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
          <span className="text-[13px] font-medium text-[var(--text-primary)]">WriteNow</span>
        </div>
        {!focusMode && (
          <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
            <button type="button" className="wn-titlebar-pill" title="File">
              File
            </button>
            <button type="button" className="wn-titlebar-pill" title="Edit">
              Edit
            </button>
            <button type="button" className="wn-titlebar-pill" title="View">
              View
            </button>
            <button type="button" className="wn-titlebar-pill" title="Publish">
              Publish
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 wn-no-drag">
        {!focusMode && (
          <>
            <button
              type="button"
              onClick={onToggleStatsBar}
              className="wn-icon-btn"
              aria-label={statsBarOpen ? 'Hide stats bar' : 'Show stats bar'}
              title={statsBarOpen ? 'Hide stats' : 'Show stats'}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
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
    </div>
  );
}
