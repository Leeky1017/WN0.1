/**
 * Textarea component
 * Based on shadcn/ui, adapted to use WriteNow Design Tokens
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Whether the input is in an error state */
  error?: boolean;
  /** Whether the textarea should auto-resize based on content */
  autoResize?: boolean;
  /** Minimum height in pixels (only applies when autoResize is true) */
  minHeight?: number;
  /** Maximum height in pixels (only applies when autoResize is true) */
  maxHeight?: number;
}

/**
 * Textarea component with auto-resize capability.
 * 
 * Why auto-resize: Provides better UX by expanding to fit content,
 * eliminating the need for users to scroll within a small text area.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      autoResize = false,
      minHeight = 80,
      maxHeight,
      onChange,
      ...props
    },
    ref
  ) => {
    // Internal ref for auto-resize functionality
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    // Use forwarded ref if provided, otherwise use internal ref
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    /**
     * Auto-resize handler.
     */
    const handleResize = React.useCallback(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        // Reset height to auto to get accurate scrollHeight
        textarea.style.height = 'auto';
        // Calculate new height within bounds
        let newHeight = textarea.scrollHeight;
        if (minHeight) {
          newHeight = Math.max(newHeight, minHeight);
        }
        if (maxHeight) {
          newHeight = Math.min(newHeight, maxHeight);
        }
        textarea.style.height = `${newHeight}px`;
      }
    }, [autoResize, minHeight, maxHeight, textareaRef]);

    // Resize on initial render and when value changes
    React.useEffect(() => {
      handleResize();
    }, [props.value, handleResize]);

    return (
      <textarea
        ref={textareaRef}
        onChange={(e) => {
          handleResize();
          onChange?.(e);
        }}
        style={{
          minHeight: autoResize ? minHeight : undefined,
          maxHeight: autoResize ? maxHeight : undefined,
        }}
        className={cn(
          // Base styles
          'w-full rounded-md border bg-[var(--bg-input)] text-[var(--fg-default)]',
          // Placeholder
          'placeholder:text-[var(--fg-placeholder)]',
          // Padding and typography
          'p-3 text-sm leading-relaxed',
          // Min height for non-autoResize mode
          !autoResize && 'min-h-[80px]',
          // Disable manual resize when auto-resize is enabled
          autoResize ? 'resize-none' : 'resize-y',
          // Transition
          'transition-colors duration-[100ms] ease-out',
          // Focus state
          'focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Error state vs default border
          error
            ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]'
            : 'border-[var(--border-default)]',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
