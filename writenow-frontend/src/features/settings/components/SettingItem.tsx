/**
 * SettingItem - Unified setting item wrapper with label, description, and control.
 *
 * Why: Ensures consistent layout and spacing for all settings items,
 * with optional description and flexible control slot (Switch, Select, Input, etc.)
 */

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface SettingItemProps {
  /** Main label text */
  label: string;
  /** Optional description text below the label */
  description?: string;
  /** The control element (Switch, Select, Input, etc.) */
  children: ReactNode;
  /** Layout variant: 'row' places control on the right, 'stack' stacks vertically */
  layout?: 'row' | 'stack';
  /** Additional class names for the container */
  className?: string;
  /** Mark this setting as disabled (applies reduced opacity) */
  disabled?: boolean;
  /** Data test ID for testing */
  'data-testid'?: string;
}

export function SettingItem({
  label,
  description,
  children,
  layout = 'stack',
  className,
  disabled,
  'data-testid': testId,
}: SettingItemProps) {
  if (layout === 'row') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 py-2',
          'transition-opacity duration-150',
          disabled && 'opacity-50',
          className,
        )}
        data-testid={testId}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[12px] font-medium text-[var(--fg-default)]">{label}</span>
          {description && (
            <span className="text-[10px] text-[var(--fg-muted)] mt-0.5 leading-relaxed">
              {description}
            </span>
          )}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    );
  }

  // Stack layout (default)
  return (
    <div
      className={cn(
        'space-y-1.5',
        'transition-opacity duration-150',
        disabled && 'opacity-50',
        className,
      )}
      data-testid={testId}
    >
      <div className="text-[11px] text-[var(--fg-muted)] font-medium">{label}</div>
      {children}
      {description && (
        <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">{description}</div>
      )}
    </div>
  );
}
