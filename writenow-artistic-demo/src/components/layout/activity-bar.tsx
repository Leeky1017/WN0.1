import { 
  Library, 
  Search, 
  LayoutTemplate, 
  History, 
  Settings,
  Plus
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

/** Tab identifier type for sidebar navigation */
export type SidebarTab = 'files' | 'search' | 'outline' | 'history' | 'settings';

interface ActivityBarProps {
  /** Currently active tab */
  activeTab: SidebarTab;
  /** Callback when tab changes */
  onTabChange: (tab: SidebarTab) => void;
}

/** Navigation item configuration */
interface NavItem {
  id: SidebarTab;
  icon: LucideIcon;
  label: string;
}

/**
 * Activity bar navigation items.
 * Why: Separate main navigation from settings for logical grouping.
 */
const NAV_ITEMS: NavItem[] = [
  { id: 'files', icon: Library, label: 'Files' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'outline', icon: LayoutTemplate, label: 'Outline' },
  { id: 'history', icon: History, label: 'History' },
];

/**
 * ActivityBar - VS Code/Cursor style icon navigation rail.
 * 
 * Why separate from SidebarPanel: Following the separation of concerns principle,
 * the activity bar handles navigation while the panel displays content.
 * 
 * Layout: Fixed 48px (w-12) width containing icon buttons with tooltips.
 * The active state includes a glowing left indicator for visual feedback.
 * 
 * @example
 * ```tsx
 * <ActivityBar
 *   activeTab="files"
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 * ```
 */
export function ActivityBar({ activeTab, onTabChange }: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-12 h-full flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center py-2 gap-1">
          {NAV_ITEMS.map((item) => (
            <ActivityBarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </nav>

        {/* Quick Add Button */}
        <div className="flex justify-center py-2">
          <IconButton 
            icon={Plus} 
            variant="subtle" 
            size="sm" 
            tooltip="New"
            tooltipSide="right"
          />
        </div>

        <Divider className="mx-3" />

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-1 py-2">
          <ActivityBarItem
            icon={Settings}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => onTabChange('settings')}
          />
          <Avatar size="sm" fallback="U" className="mt-1" />
        </div>
      </aside>
    </TooltipProvider>
  );
}

interface ActivityBarItemProps {
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
function ActivityBarItem({ icon: Icon, label, active, onClick }: ActivityBarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
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
