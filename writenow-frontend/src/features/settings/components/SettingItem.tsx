/**
 * SettingItem
 * Why: Keep settings rows consistent (label/description/control) without over-abstracting business logic.
 */

import type { ReactNode } from 'react';

export interface SettingItemProps {
  label: string;
  description?: string;
  control: ReactNode;
}

export function SettingItem({ label, description, control }: SettingItemProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
        {description && <div className="mt-1 text-xs text-[var(--text-muted)]">{description}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default SettingItem;

