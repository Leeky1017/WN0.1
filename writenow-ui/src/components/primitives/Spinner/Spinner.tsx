/**
 * Spinner Component
 * 
 * 加载指示器组件，支持 sm/md/lg 三种尺寸。
 * 
 * @see DESIGN_SPEC.md 3.14 Spinner
 */
import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 尺寸样式映射
 * 
 * | 尺寸 | 宽高 | 边框宽度 |
 * |------|------|----------|
 * | sm | 16px | 2px |
 * | md | 24px | 2px |
 * | lg | 32px | 3px |
 */
const sizeStyles: Record<NonNullable<SpinnerProps['size']>, { dimension: string; border: string }> = {
  sm: { dimension: 'w-4 h-4', border: 'border-2' },
  md: { dimension: 'w-6 h-6', border: 'border-2' },
  lg: { dimension: 'w-8 h-8', border: 'border-[3px]' },
};

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const { dimension, border } = sizeStyles[size];

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={clsx(
          dimension,
          border,
          'rounded-full',
          'border-[var(--color-border-default)]',
          'border-t-current', // 使用 currentColor 作为前景色
          'animate-spin',
          className,
        )}
        {...props}
      />
    );
  }
);

Spinner.displayName = 'Spinner';
