/**
 * SettingSection - Enhanced section wrapper with better visual hierarchy.
 *
 * Why: Adds breathing room and visual separation between settings sections,
 * improving the overall UX compared to the base SidebarPanelSection.
 */

import { SidebarPanelSection } from '@/components/layout/sidebar-panel';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface SettingSectionProps {
  /** Section title */
  title: string;
  /** Whether to start collapsed */
  defaultCollapsed?: boolean;
  /** Section content */
  children: ReactNode;
  /** Optional hint text shown below the title */
  hint?: string;
  /** Additional class names */
  className?: string;
}

export function SettingSection({
  title,
  defaultCollapsed,
  children,
  hint,
  className,
}: SettingSectionProps) {
  return (
    <SidebarPanelSection title={title} defaultCollapsed={defaultCollapsed} className={className}>
      <div className={cn('px-2 space-y-3')}>
        {hint && (
          <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed -mt-1">{hint}</div>
        )}
        {children}
      </div>
    </SidebarPanelSection>
  );
}
