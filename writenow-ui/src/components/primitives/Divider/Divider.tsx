/**
 * Divider Component
 * 
 * 分割线组件，支持水平/垂直方向，可选标签。
 * 
 * @see DESIGN_SPEC.md 3.7 Divider
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** 方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 标签文本 */
  label?: ReactNode;
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', label, className, ...props }, ref) => {
    // 垂直分割线
    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="vertical"
          className={clsx(
            'w-px h-full',
            'bg-[var(--color-border-default)]',
            className,
          )}
          {...props}
        />
      );
    }

    // 水平分割线（无标签）
    if (!label) {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="horizontal"
          className={clsx(
            'w-full h-px',
            'bg-[var(--color-border-default)]',
            className,
          )}
          {...props}
        />
      );
    }

    // 水平分割线（有标签）
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        className={clsx(
          'flex items-center gap-4',
          'w-full',
          className,
        )}
        {...props}
      >
        <div className="flex-1 h-px bg-[var(--color-border-default)]" />
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
          {label}
        </span>
        <div className="flex-1 h-px bg-[var(--color-border-default)]" />
      </div>
    );
  }
);

Divider.displayName = 'Divider';
