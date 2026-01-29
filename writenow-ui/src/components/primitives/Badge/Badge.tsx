/**
 * Badge Component
 * 
 * 标签/徽章组件，支持 default/success/warning/error 四种变体。
 * 
 * @see DESIGN_SPEC.md 3.4 Badge / Tag
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 徽章变体 */
  variant?: 'default' | 'success' | 'warning' | 'error';
  /** 子元素 */
  children: ReactNode;
}

/**
 * 变体样式映射
 * 
 * | 变体 | 边框色 | 文字色 |
 * |------|--------|--------|
 * | default | #222222 | #888888 |
 * | success | #44ff44 | #44ff44 |
 * | warning | #ffaa44 | #ffaa44 |
 * | error | #ff4444 | #ff4444 |
 */
const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'border-[var(--color-border-default)] text-[var(--color-text-secondary)]',
  success: 'border-[var(--color-success)] text-[var(--color-success)]',
  warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
  error: 'border-[var(--color-error)] text-[var(--color-error)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          // 基础样式
          'inline-flex items-center justify-center',
          'px-2.5 py-1',
          'bg-transparent',
          'border rounded-full',
          'text-[11px] uppercase',
          'tracking-[0.05em]',
          'transition-opacity duration-[150ms]',
          
          // 变体样式
          variantStyles[variant],
          
          // 自定义类名
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
