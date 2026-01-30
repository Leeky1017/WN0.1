/**
 * Card Component
 * 
 * 卡片容器组件，支持 default/outlined/elevated 变体。
 * 
 * @see DESIGN_SPEC.md 3.3 Card
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片变体 */
  variant?: 'default' | 'outlined' | 'elevated';
  /** 是否可点击 */
  clickable?: boolean;
  /** 内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** 子元素 */
  children?: ReactNode;
}

/**
 * 内边距样式映射
 * 
 * | 尺寸 | 值 |
 * |------|-----|
 * | none | 0 |
 * | sm | 16px |
 * | md | 24px |
 * | lg | 32px |
 */
const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      clickable = false,
      padding = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        className={clsx(
          // 基础样式
          'rounded-[24px]',
          'border border-[var(--color-border-default)]',
          'transition-all duration-[300ms]',
          
          // 内边距
          paddingStyles[padding],
          
          // 变体样式
          variant === 'default' && 'bg-[var(--color-bg-surface)]',
          variant === 'outlined' && 'bg-transparent',
          variant === 'elevated' && 'bg-[var(--color-bg-surface)] shadow-md',
          
          // 可点击状态
          clickable && clsx(
            'cursor-pointer',
            'hover:border-[var(--color-border-active)]',
            'hover:bg-[var(--color-bg-hover)]',
            'active:bg-[var(--color-bg-active)]',
          ),
          
          // 自定义类名
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
