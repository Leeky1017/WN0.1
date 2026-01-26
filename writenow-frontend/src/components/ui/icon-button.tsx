/**
 * IconButton component
 * Icon-only button with optional tooltip support
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import type { LucideIcon } from 'lucide-react';

type IconButtonVariant = 'ghost' | 'subtle' | 'solid';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** Visual style variant */
  variant?: IconButtonVariant;
  /** Size of the button */
  size?: IconButtonSize;
  /** Whether the button is in an active/selected state */
  active?: boolean;
  /** Tooltip text to show on hover */
  tooltip?: string;
  /** Side of the button to show the tooltip */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Variant styles mapping.
 * Why: Different visual emphasis levels for different use cases.
 * - ghost: Minimal emphasis, blends into background
 * - subtle: Light background, moderate emphasis
 * - solid: Full accent color, high emphasis
 */
const variantStyles: Record<IconButtonVariant, string> = {
  ghost: `
    bg-transparent text-[var(--fg-muted)]
    hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default)]
    active:bg-[var(--bg-active)]
  `,
  subtle: `
    bg-[var(--bg-input)] text-[var(--fg-muted)] border border-[var(--border-subtle)]
    hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default)] hover:border-[var(--border-default)]
    active:bg-[var(--bg-active)]
  `,
  solid: `
    bg-[var(--accent-default)] text-[var(--fg-on-accent)]
    hover:bg-[var(--accent-hover)]
    active:bg-[var(--accent-active)]
  `,
};

/**
 * Size configuration including button dimensions and icon size.
 * Why: Icons need to scale proportionally with button size.
 */
const sizeConfig: Record<IconButtonSize, { button: string; icon: number }> = {
  sm: { button: 'w-7 h-7', icon: 14 },
  md: { button: 'w-8 h-8', icon: 16 },
  lg: { button: 'w-10 h-10', icon: 18 },
};

/**
 * Icon-only button component with optional tooltip.
 * 
 * Why: Actions that can be represented by a single icon don't need text labels.
 * The tooltip provides context on hover for accessibility.
 * 
 * @example
 * ```tsx
 * <IconButton icon={Settings} tooltip="Settings" />
 * <IconButton icon={Search} variant="subtle" size="lg" />
 * <IconButton icon={Star} variant="solid" active />
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      icon: Icon,
      variant = 'ghost',
      size = 'md',
      active,
      tooltip,
      tooltipSide = 'bottom',
      disabled,
      ...props
    },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md',
          // Transition
          'transition-colors duration-[100ms] ease-out',
          // Disabled state
          'disabled:opacity-50 disabled:pointer-events-none',
          // Variant and size styles
          variantStyles[variant],
          sizeConfig[size].button,
          // Active state overrides variant styles
          active && 'bg-[var(--bg-active)] text-[var(--fg-default)]',
          className
        )}
        {...props}
      >
        <Icon
          size={sizeConfig[size].icon}
          strokeWidth={active ? 2.5 : 2}
          aria-hidden="true"
        />
      </button>
    );

    // Wrap with tooltip if tooltip text is provided
    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  }
);

IconButton.displayName = 'IconButton';
