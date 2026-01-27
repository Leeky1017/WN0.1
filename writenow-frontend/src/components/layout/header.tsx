import { Sidebar as SidebarIcon, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsBar } from './StatsBar';

interface HeaderProps {
  /** Current file name to display */
  fileName?: string;
  /** Whether the file has unsaved changes */
  isSaved?: boolean;
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
  isSaved = true,
  isSidebarOpen,
  onToggleSidebar,
  isAiPanelOpen,
  onToggleAiPanel,
}: HeaderProps) {
  return (
    <header className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] z-50 relative">
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
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isSaved
              ? 'bg-[var(--success)] shadow-[0_0_5px_var(--success)]'
              : 'bg-[var(--warning)] shadow-[0_0_5px_var(--warning)]'
          )}
          title={isSaved ? 'All changes saved' : 'Unsaved changes'}
        />
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
