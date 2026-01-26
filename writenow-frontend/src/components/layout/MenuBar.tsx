/**
 * MenuBar - 顶部菜单栏组件（Header 风格）
 * Why: 提供应用导航和全局控制按钮
 * 
 * Layout:
 * - Left: Menu items + App branding
 * - Center: File name + save status (absolute positioned for true centering)
 * - Right: Stats toggle + Focus mode + AI panel toggle
 */

import { Maximize2, PanelRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useEditorFilesStore } from '@/stores/editorFilesStore';

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
  // Get current file info from store
  const activeFilePath = useEditorRuntimeStore((s) => s.activeFilePath);
  const fileState = useEditorFilesStore((s) => 
    activeFilePath ? s.byPath[activeFilePath] : undefined
  );
  
  // Extract file name and save status
  const fileName = activeFilePath 
    ? activeFilePath.split('/').pop() || '未命名'
    : '未选择文件';
  const isSaved = !fileState?.isDirty;
  
  return (
    <header 
      className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] z-50 relative" 
      data-testid="menubar"
    >
      {/* Left: Menu Items + App Branding */}
      <div className="flex items-center gap-4">
        {/* Menu Items */}
        <div className="flex gap-1">
          <span 
            data-testid="menu-file" 
            className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          >
            File
          </span>
          <span 
            data-testid="menu-edit" 
            className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          >
            Edit
          </span>
          <span 
            data-testid="menu-view" 
            className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          >
            View
          </span>
          <span 
            data-testid="menu-publish" 
            className="hover:bg-[var(--bg-hover)] px-2.5 py-1 rounded-md cursor-pointer transition-all text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          >
            Publish
          </span>
        </div>
        
        {/* Vertical Divider */}
        <div className="w-px h-4 bg-[var(--border-subtle)]" />
        
        {/* App Branding */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border border-white/[0.08]">
            <span className="text-[10px] font-bold text-white">W</span>
          </div>
          <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--fg-muted)] uppercase">
            WriteNow
          </span>
        </div>
      </div>

      {/* Center: File Name + Save Status (absolute positioned for true centering) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[11px] font-medium text-[var(--fg-muted)]" data-testid="app-title">
          {fileName}
        </span>
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isSaved
              ? 'bg-[var(--success)] shadow-[0_0_5px_var(--success)]'
              : 'bg-[var(--warning)] shadow-[0_0_5px_var(--warning)]'
          )}
          title={isSaved ? '已保存' : '有未保存的更改'}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Stats Toggle */}
        <button
          data-testid="toggle-stats-bar"
          onClick={onToggleStatsBar}
          className={cn(
            'p-1.5 rounded-md transition-all',
            statsBarOpen
              ? 'text-[var(--accent-default)] bg-[var(--accent-muted)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)]'
          )}
          aria-label={statsBarOpen ? '隐藏统计栏' : '显示统计栏'}
        >
          <BarChart3 size={16} />
        </button>

        {/* Focus Mode */}
        <button
          data-testid="toggle-focus-mode"
          onClick={onToggleFocusMode}
          className="p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-all"
          aria-label="专注模式"
        >
          <Maximize2 size={16} />
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* AI Panel Toggle */}
        <button
          data-testid="toggle-ai-panel"
          onClick={onToggleAiPanel}
          className="p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-all"
          aria-label="AI 助手"
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  );
}

export default MenuBar;
