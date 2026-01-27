import { cn } from '@/lib/utils';

interface DividerProps {
  /** Orientation of the divider line */
  orientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Divider component for visual separation.
 * 
 * Why subtle border color: Dividers should be visible but not distracting,
 * using the weakest border color from the design system.
 * 
 * @example
 * ```tsx
 * <Divider />
 * <Divider orientation="vertical" className="h-4" />
 * ```
 */
export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-[var(--border-subtle)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
    />
  );
}
