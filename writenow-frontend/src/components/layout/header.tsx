import { Sidebar as SidebarIcon, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsBar } from './StatsBar';
import type { SaveStatus } from '@/stores/statusBarStore';

interface HeaderProps {
  /** Current file name to display */
  fileName?: string;
  /** When true, Write Mode is in Review Mode for AI diff (Accept/Reject pending). */
  reviewingAiChanges?: boolean;
  /** Unified save status (SSOT) */
  saveStatus: SaveStatus;
  /** Human-readable error message when saveStatus === 'error' */
  saveErrorMessage?: string;
  /** Retry callback when saveStatus === 'error' */
  onRetrySave?: () => void;
  /** Whether the sidebar is currently open */
  isSidebarOpen: boolean;
  /** Callback to toggle sidebar visibility */
  onToggleSidebar: () => void;
  /** Whether the AI panel is currently open */
  isAiPanelOpen: boolean;
  /** Callback to toggle AI panel visibility */
  onToggleAiPanel: () => void;
}

/**
 * Header - The command center of the application.
 *
 * Layout:
 * - Left: Sidebar toggle + App branding
 * - Center: File name + save status (absolute positioned)
 * - Right: Stats + AI panel toggle
 *
 * Why absolute centering: Ensures the file name stays perfectly centered
 * regardless of the content width on left/right sides.
 */
export function Header({
  fileName = 'Untitled',
  reviewingAiChanges = false,
  saveStatus,
  saveErrorMessage,
  onRetrySave,
  isSidebarOpen,
  onToggleSidebar,
  isAiPanelOpen,
  onToggleAiPanel,
}: HeaderProps) {
  const saveLabel =
    saveStatus === 'saved'
      ? '已保存'
      : saveStatus === 'saving'
        ? '保存中…'
        : saveStatus === 'unsaved'
          ? '未保存'
          : '保存失败';

  const saveDotClass =
    saveStatus === 'saved'
      ? 'bg-[var(--success)] shadow-[0_0_5px_var(--success)]'
      : saveStatus === 'saving'
        ? 'bg-[var(--accent-default)] shadow-[0_0_5px_var(--accent-default)] animate-pulse'
        : saveStatus === 'unsaved'
          ? 'bg-[var(--warning)] shadow-[0_0_5px_var(--warning)]'
          : 'bg-[var(--error)] shadow-[0_0_5px_var(--error)]';

  const saveTitle =
    saveStatus === 'error' && saveErrorMessage
      ? `保存失败：${saveErrorMessage}`
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'saving'
          ? '保存中…'
          : '未保存';

  return (
    <header
      className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] z-50 relative"
      data-testid="wm-header"
    >
      {/* Left: Sidebar Toggle + Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className={cn(
              'p-1.5 rounded-md transition-all',
              isSidebarOpen
                ? 'text-[var(--accent-default)] bg-[var(--accent-muted)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)]'
            )}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <SidebarIcon size={16} />
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border border-white/[0.08]">
              <span className="text-[10px] font-bold text-white">W</span>
            </div>
            <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--fg-muted)] uppercase">
              WriteNow
            </span>
          </div>
        </div>
      </div>

      {/* Center: File Name + Status (absolute positioned for true centering) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[11px] font-medium text-[var(--fg-muted)]">
          {fileName}
        </span>
        {reviewingAiChanges && (
          <span className="px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--accent-muted)] text-[10px] font-semibold text-[var(--accent-default)]">
            Reviewing AI changes
          </span>
        )}
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1 rounded-md border border-[var(--border-subtle)]',
            saveStatus === 'error' && onRetrySave ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : 'bg-transparent'
          )}
          data-testid="wm-save-indicator"
          title={saveTitle}
          role={saveStatus === 'error' && onRetrySave ? 'button' : undefined}
          tabIndex={saveStatus === 'error' && onRetrySave ? 0 : undefined}
          onClick={saveStatus === 'error' && onRetrySave ? onRetrySave : undefined}
          onKeyDown={
            saveStatus === 'error' && onRetrySave
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRetrySave();
                  }
                }
              : undefined
          }
        >
          <div className={cn('w-1.5 h-1.5 rounded-full', saveDotClass)} />
          <span className="text-[10px] font-semibold text-[var(--fg-subtle)]">{saveLabel}</span>
          {saveStatus === 'error' && onRetrySave && (
            <span className="text-[10px] text-[var(--fg-muted)]">· 重试</span>
          )}
        </div>
      </div>

      {/* Right: Stats + AI Panel Toggle */}
      <div className="flex items-center gap-3">
        <StatsBar />
        <div className="w-px h-4 bg-[var(--border-strong)] opacity-20" />
        <button
          onClick={onToggleAiPanel}
          className={cn(
            'p-1.5 rounded-md transition-all',
            isAiPanelOpen
              ? 'text-[var(--accent-default)] bg-[var(--accent-muted)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)]'
          )}
          aria-label={isAiPanelOpen ? 'Close AI panel' : 'Open AI panel'}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  );
}
