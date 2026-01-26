/**
 * ActivityBar - VS Code/Cursor style icon navigation rail.
 * 
 * Why separate from SidebarPanel: Following the separation of concerns principle,
 * the activity bar handles navigation while the panel displays content.
 */

import {
  Files,
  ListTree,
  History,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { Avatar } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type SidebarView =
  | 'files'
  | 'outline'
  | 'history'
  | 'stats'
  | 'settings';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

/** Navigation item configuration */
interface NavItem {
  id: SidebarView;
  icon: LucideIcon;
  label: string;
}

/**
 * Main navigation items - primary functionality.
 */
const MAIN_NAV_ITEMS: NavItem[] = [
  { id: 'files', icon: Files, label: '文件浏览器' },
  { id: 'outline', icon: ListTree, label: '文档大纲' },
  { id: 'history', icon: History, label: '版本历史' },
];

/**
 * Secondary navigation items - utilities.
 */
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'stats', icon: BarChart3, label: '创作统计' },
];

/**
 * ActivityBar - VS Code/Cursor style icon navigation rail.
 * 
 * Layout: Fixed 48px (w-12) width containing icon buttons with tooltips.
 * The active state includes a glowing left indicator for visual feedback.
 * 
 * @example
 * ```tsx
 * <ActivityBar
 *   activeView="files"
 *   onViewChange={(view) => setActiveView(view)}
 * />
 * ```
 */
export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-12 h-full flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center py-2 gap-1">
          {MAIN_NAV_ITEMS.map((item) => (
            <ActivityBarItem
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
            />
          ))}
          
          {/* Separator between main and secondary navigation */}
          <Divider className="mx-3 my-2" />
          
          {SECONDARY_NAV_ITEMS.map((item) => (
            <ActivityBarItem
              key={item.id}
              id={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
            />
          ))}
        </nav>

        {/* Quick Add Button */}
        <div className="flex justify-center py-2">
          <IconButton 
            icon={Plus} 
            variant="subtle" 
            size="sm" 
            tooltip="新建文档"
            tooltipSide="right"
          />
        </div>

        <Divider className="mx-3" />

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-1 py-2">
          <ActivityBarItem
            id="settings"
            icon={Settings}
            label="设置"
            active={activeView === 'settings'}
            onClick={() => onViewChange('settings')}
          />
          <Avatar size="sm" fallback="U" className="mt-1" />
        </div>
      </aside>
    </TooltipProvider>
  );
}

interface ActivityBarItemProps {
  /** SidebarView id (used for stable test selectors) */
  id: SidebarView;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tooltip label */
  label: string;
  /** Whether this item is currently active */
  active: boolean;
  /** Click handler */
  onClick: () => void;
}

/**
 * Individual activity bar item with active state indicator.
 * 
 * Why custom component instead of IconButton: The active indicator
 * requires absolute positioning relative to the button, which is
 * specific to the activity bar layout.
 * 
 * Active indicator: Uses CSS box-shadow for the glow effect
 * to avoid additional DOM elements and layout calculations.
 */
function ActivityBarItem({ id, icon: Icon, label, active, onClick }: ActivityBarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          data-testid={`activity-${id}`}
          title={label}
          aria-label={label}
          onClick={onClick}
          className={cn(
            'relative w-10 h-10 flex items-center justify-center rounded-lg',
            'transition-all duration-[100ms] ease-out',
            active
              ? 'bg-[var(--bg-active)] text-[var(--fg-default)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)]'
          )}
        >
          <Icon 
            size={18} 
            strokeWidth={active ? 2.5 : 2} 
            aria-hidden="true"
          />
          
          {/* Active Indicator with Glow Effect */}
          {active && (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[var(--accent-default)]"
              style={{ 
                boxShadow: '0 0 8px var(--accent-default), 0 0 12px var(--accent-default)' 
              }}
              aria-hidden="true"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="right" 
        className="text-[11px] font-medium"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default ActivityBar;
