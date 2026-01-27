import { 
  Library, 
  Search, 
  Settings, 
  History,
  LayoutTemplate,
  User,
  ChevronRight,
  Plus
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type SidebarTab = 'files' | 'search' | 'outline' | 'history' | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

/**
 * Sidebar - Legacy navigation component.
 * 
 * @deprecated Use ActivityBar from './activity-bar.tsx' instead.
 * This component is kept for reference but is no longer used in the main app.
 */
export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems: { id: SidebarTab; icon: LucideIcon; label: string }[] = [
    { id: 'files', icon: Library, label: 'Files' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'outline', icon: LayoutTemplate, label: 'Outline' },
    { id: 'history', icon: History, label: 'History' },
  ];

  const bottomItems: { id: SidebarTab; icon: LucideIcon; label: string }[] = [
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full w-full flex flex-col items-center py-3 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] relative overflow-hidden">
        
        {/* Navigation Group */}
        <nav className="w-full flex flex-col items-center gap-1">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.id} 
              icon={item.icon} 
              label={item.label} 
              isActive={activeTab === item.id} 
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </nav>

        {/* Global Action (Add) */}
        <div className="w-full flex flex-col items-center mt-4">
           <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:border-[var(--border-strong)] transition-all">
              <Plus size={14} />
           </button>
        </div>

        {/* Bottom Stack */}
        <div className="w-full flex flex-col items-center gap-1 mt-auto pb-2">
          {bottomItems.map((item) => (
            <SidebarItem 
              key={item.id} 
              icon={item.icon} 
              label={item.label} 
              isActive={activeTab === item.id} 
              onClick={() => onTabChange(item.id)}
            />
          ))}
          
          <div className="w-6 h-px bg-[var(--border-subtle)] my-2 opacity-50" />

          {/* User Profile */}
          <button className="w-8 h-8 rounded-full bg-[var(--bg-active)]/50 border border-[var(--border-subtle)] flex items-center justify-center hover:ring-2 ring-[var(--accent-muted)] transition-all overflow-hidden group">
              <User className="w-4 h-4 text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]" />
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SidebarItem({ icon: Icon, label, isActive, onClick }: SidebarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group",
            isActive 
              ? "bg-[var(--bg-active)] text-[var(--fg-default)]" 
              : "text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)]"
          )}
        >
          <Icon strokeWidth={isActive ? 2.5 : 2} className="w-[18px] h-[18px]" />
          
          {/* Active Indicator - Stronger */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent-default)] shadow-[0_0_6px_var(--accent-default)]" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 flex items-center gap-2">
        {label}
        <ChevronRight size={10} className="opacity-40" />
      </TooltipContent>
    </Tooltip>
  );
}
