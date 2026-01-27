import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
 * Input component with optional icons and error state.
 * 
 * Why forwardRef: Form libraries (react-hook-form, formik) need ref access
 * for registration and focus management.
 * 
 * @example
 * ```tsx
 * <Input placeholder="Enter text" />
 * <Input leftIcon={<Search size={14} />} placeholder="Search..." />
 * <Input error rightIcon={<AlertCircle size={14} />} />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputSize = 'md',
      leftIcon,
      rightIcon,
      error,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('relative flex items-center', disabled && 'opacity-50')}>
        {/* Left icon container */}
        {leftIcon && (
          <div className="absolute left-2.5 text-[var(--fg-subtle)] pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
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
    );
  }
);

Input.displayName = 'Input';
