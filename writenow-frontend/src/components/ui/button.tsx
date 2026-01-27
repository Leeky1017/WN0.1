import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Icon to display before the button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the button text */
  rightIcon?: React.ReactNode;
  /** Shows a loading spinner and disables the button */
  loading?: boolean;
}

/**
 * Variant styles mapping.
 * Why: Centralized style definitions for each visual variant.
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--accent-default)] text-[var(--fg-on-accent)]
    hover:bg-[var(--accent-hover)]
    active:bg-[var(--accent-active)]
    focus-visible:ring-2 focus-visible:ring-[var(--accent-default)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]
  `,
  secondary: `
    bg-[var(--bg-elevated)] text-[var(--fg-default)] border border-[var(--border-default)]
    hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]
    active:bg-[var(--bg-active)]
  `,
  ghost: `
    bg-transparent text-[var(--fg-muted)]
    hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default)]
    active:bg-[var(--bg-active)]
  `,
  danger: `
    bg-[var(--error)] text-[var(--fg-on-accent)]
    hover:bg-[var(--error)]/90
    active:bg-[var(--error)]/80
  `,
};

/**
 * Size styles mapping.
 * Why: Consistent sizing across all button instances.
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-10 px-4 text-base gap-2',
};

/**
 * Button component with multiple variants and sizes.
 * 
 * Why forwardRef: Allows parent components to access the underlying button element
 * for focus management, animations, or other DOM operations.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="ghost" leftIcon={<Icon />}>With Icon</Button>
 * <Button loading>Submitting...</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      leftIcon,
      rightIcon,
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium',
          // Transition - using design system's transition values
          'transition-colors duration-[100ms] ease-out',
          // Disabled state
          'disabled:opacity-50 disabled:pointer-events-none',
          // Variant and size styles
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
