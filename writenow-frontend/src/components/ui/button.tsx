/**
 * Button component
 * Based on shadcn/ui, adapted to use WriteNow Design Tokens
 */

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-[100ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-default)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent-default)] text-[var(--fg-on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',
        destructive:
          'bg-[var(--error)] text-[var(--fg-on-accent)] hover:bg-[var(--error)]/90 active:bg-[var(--error)]/80',
        outline:
          'border border-[var(--border-default)] bg-transparent text-[var(--fg-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]',
        secondary:
          'bg-[var(--bg-elevated)] text-[var(--fg-default)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] active:bg-[var(--bg-active)]',
        ghost:
          'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default)] active:bg-[var(--bg-active)]',
        link:
          'text-[var(--accent-default)] underline-offset-4 hover:underline hover:text-[var(--accent-hover)]',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-md',
        sm: 'h-7 px-2 text-xs rounded-md',
        md: 'h-8 px-3 text-sm rounded-md',
        lg: 'h-10 px-4 text-base rounded-md',
        icon: 'h-9 w-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Use a custom element as the button */
  asChild?: boolean
  /** Icon to display before the button text */
  leftIcon?: React.ReactNode
  /** Icon to display after the button text */
  rightIcon?: React.ReactNode
  /** Shows a loading spinner and disables the button */
  loading?: boolean
}

/**
 * Primary button component for user interactions
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, leftIcon, rightIcon, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
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
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button }
