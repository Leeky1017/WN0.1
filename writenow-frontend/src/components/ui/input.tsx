/**
 * Input component
 * Based on shadcn/ui, adapted to use WriteNow Design Tokens
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Size variant of the input */
  inputSize?: InputSize;
  /** Icon or element to display on the left side */
  leftIcon?: React.ReactNode;
  /** Icon or element to display on the right side */
  rightIcon?: React.ReactNode;
  /** Whether the input is in an error state */
  error?: boolean;
}

/**
 * Size styles mapping.
 * Why: Consistent sizing that aligns with the 4px spacing system.
 */
const sizeStyles: Record<InputSize, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
};

/**
 * Text input component for forms
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize = 'md', leftIcon, rightIcon, error, disabled, ...props }, ref) => {
    // Simple mode without icons
    if (!leftIcon && !rightIcon) {
      return (
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            // Base styles
            'w-full rounded-md border bg-[var(--bg-input)] text-[var(--fg-default)]',
            // Placeholder
            'placeholder:text-[var(--fg-placeholder)]',
            // Transition
            'transition-colors duration-[100ms] ease-out',
            // Focus state
            'focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
            // Disabled state
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Error state vs default border
            error
              ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]'
              : 'border-[var(--border-default)]',
            // Size styles
            sizeStyles[inputSize],
            // File input styling
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            className
          )}
          {...props}
        />
      )
    }

    // Mode with icons
    return (
      <div className={cn('relative flex items-center', disabled && 'opacity-50')}>
        {/* Left icon container */}
        {leftIcon && (
          <div className="absolute left-2.5 text-[var(--fg-subtle)] pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            // Base styles
            'w-full rounded-md border bg-[var(--bg-input)] text-[var(--fg-default)]',
            // Placeholder
            'placeholder:text-[var(--fg-placeholder)]',
            // Transition
            'transition-colors duration-[100ms] ease-out',
            // Focus state
            'focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
            // Disabled state
            'disabled:cursor-not-allowed',
            // Error state vs default border
            error
              ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]'
              : 'border-[var(--border-default)]',
            // Size styles
            sizeStyles[inputSize],
            // Adjust padding when icons are present
            leftIcon && 'pl-8',
            rightIcon && 'pr-8',
            className
          )}
          {...props}
        />

        {/* Right icon container */}
        {rightIcon && (
          <div className="absolute right-2.5 text-[var(--fg-subtle)]">
            {rightIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
