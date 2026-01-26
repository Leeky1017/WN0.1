import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';

interface BadgeProps {
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Badge content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Variant styles mapping.
 * Why: Semantic colors communicate status at a glance.
 * - default: Neutral, for non-semantic labels
 * - success: Positive states (active, completed, online)
 * - warning: Caution states (pending, draft)
 * - error: Negative states (failed, offline)
 * - accent: Highlighted items (new, featured)
 */
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-active)] text-[var(--fg-muted)]',
  success: 'bg-[var(--success-muted)] text-[var(--success)]',
  warning: 'bg-[var(--warning-muted)] text-[var(--warning)]',
  error: 'bg-[var(--error-muted)] text-[var(--error)]',
  accent: 'bg-[var(--accent-muted)] text-[var(--accent-default)]',
};

/**
 * Badge component for displaying status or labels.
 * 
 * Why uppercase + tracking-wider: Increases legibility for short labels,
 * following design conventions from Linear, GitHub, etc.
 * 
 * @example
 * ```tsx
 * <Badge>Draft</Badge>
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error">Offline</Badge>
 * ```
 */
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center px-1.5 py-0.5 rounded',
        // Typography - 10px, semibold, uppercase for readability
        'text-[10px] font-semibold uppercase tracking-wider',
        // Variant styles
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
