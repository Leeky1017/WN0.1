/**
 * SettingError - Unified error display for settings.
 *
 * Why: Ensures consistent error styling across all settings sections,
 * with proper design tokens and accessibility.
 */

import { cn } from '@/lib/utils';

export interface SettingErrorProps {
  /** Error message to display */
  message: string | null | undefined;
  /** Visual variant */
  variant?: 'error' | 'success';
  /** Additional class names */
  className?: string;
}

export function SettingError({ message, variant = 'error', className }: SettingErrorProps) {
  if (!message) return null;

  const isSuccess = variant === 'success';

  return (
    <div
      role="alert"
      className={cn(
        'text-[11px] px-2 py-1.5 rounded-md border',
        'bg-[var(--bg-elevated)]',
        isSuccess
          ? 'text-[var(--success)] border-[var(--success)]/40'
          : 'text-[var(--error)] border-[var(--error)]/40',
        className,
      )}
    >
      {message}
    </div>
  );
}
