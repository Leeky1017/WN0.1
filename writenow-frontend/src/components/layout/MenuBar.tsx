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
    <div className="h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center px-2 text-[13px]" data-testid="menubar">
      <div className="flex gap-4 px-2">
        <span data-testid="menu-file" className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">
          File
        </span>
        <span data-testid="menu-edit" className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">
          Edit
        </span>
        <span data-testid="menu-view" className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">
          View
        </span>
        <span data-testid="menu-publish" className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded cursor-pointer transition-colors">
          Publish
        </span>
      </div>
      <div className="flex-1 text-center text-[var(--text-tertiary)] text-[11px]" data-testid="app-title">
        WriteNow
      </div>
      <div className="flex gap-2 items-center">
        <button
          data-testid="toggle-stats-bar"
          onClick={onToggleStatsBar}
          className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] transition-colors"
        >
          {statsBarOpen ? 'Hide Stats' : 'Show Stats'}
        </button>
        <button
          data-testid="toggle-focus-mode"
          onClick={onToggleFocusMode}
          className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] transition-colors"
        >
          Focus
        </button>
        <button
          data-testid="toggle-ai-panel"
          onClick={onToggleAiPanel}
          className="hover:bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] transition-colors"
        >
          AI
        </button>
      </div>
    </div>
  );
}

export default MenuBar;
