/**
 * MenuBar - 顶部菜单栏组件
 * Why: 提供 File/Edit/View/Publish 菜单和全局控制按钮
 */

interface MenuBarProps {
  statsBarOpen: boolean;
  onToggleStatsBar: () => void;
  onToggleFocusMode: () => void;
  onToggleAiPanel: () => void;
}

export function MenuBar({
  statsBarOpen,
  onToggleStatsBar,
  onToggleFocusMode,
  onToggleAiPanel,
}: MenuBarProps) {
  return (
    <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center px-3 text-[13px]" data-testid="menubar">
      <div className="flex gap-1 px-1">
        <span data-testid="menu-file" className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          File
        </span>
        <span data-testid="menu-edit" className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Edit
        </span>
        <span data-testid="menu-view" className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          View
        </span>
        <span data-testid="menu-publish" className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Publish
        </span>
      </div>
      <div className="flex-1 text-center text-[var(--text-tertiary)] text-[11px] font-medium tracking-wide" data-testid="app-title">
        WriteNow
      </div>
      <div className="flex gap-1.5 items-center">
        <button
          data-testid="toggle-stats-bar"
          onClick={onToggleStatsBar}
          className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          {statsBarOpen ? 'Hide Stats' : 'Show Stats'}
        </button>
        <button
          data-testid="toggle-focus-mode"
          onClick={onToggleFocusMode}
          className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          Focus
        </button>
        <button
          data-testid="toggle-ai-panel"
          onClick={onToggleAiPanel}
          className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          AI
        </button>
      </div>
    </div>
  );
}

export default MenuBar;
