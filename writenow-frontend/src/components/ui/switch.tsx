import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

/**
 * Switch
 * Why: Small, accessible toggle used in Settings panel.
 */
export const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-default)]',
          'bg-[var(--bg-input)] transition-colors duration-[120ms] ease-out',
          'data-[state=checked]:bg-[var(--accent-default)] data-[state=checked]:border-[var(--accent-default)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-[var(--fg-default)] shadow-sm',
            'translate-x-0.5 transition-transform duration-[120ms] ease-out',
            'data-[state=checked]:translate-x-[18px]',
          )}
        />
      </SwitchPrimitive.Root>
    );
  },
);

Switch.displayName = 'Switch';

