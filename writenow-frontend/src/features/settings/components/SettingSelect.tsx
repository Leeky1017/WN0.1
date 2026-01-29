/**
 * SettingSelect - Unified select dropdown for settings.
 *
 * Why: Ensures consistent styling for all select elements in settings,
 * with proper design token usage and accessible labeling.
 */

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SettingSelectProps<T extends string = string>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Currently selected value */
  value: T;
  /** Available options */
  options: readonly SelectOption<T>[];
  /** Change handler */
  onChange: (value: T) => void;
  /** Visual size variant */
  size?: 'sm' | 'md';
}

function SettingSelectInner<T extends string = string>(
  {
    value,
    options,
    onChange,
    size = 'sm',
    className,
    disabled,
    ...props
  }: SettingSelectProps<T>,
  ref: React.ForwardedRef<HTMLSelectElement>,
) {
  return (
    <select
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
      className={cn(
        'w-full rounded-md border border-[var(--border-default)]',
        'bg-[var(--bg-input)] text-[var(--fg-default)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent-default)]/50 focus:border-[var(--accent-default)]',
        'hover:border-[var(--border-hover)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-all duration-150 ease-out',
        'cursor-pointer',
        size === 'sm' ? 'h-8 text-[12px] px-2' : 'h-9 text-[13px] px-3',
        className,
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Use type assertion to maintain generic type parameter with forwardRef
export const SettingSelect = forwardRef(SettingSelectInner) as <T extends string = string>(
  props: SettingSelectProps<T> & { ref?: React.ForwardedRef<HTMLSelectElement> },
) => React.ReactElement | null;
