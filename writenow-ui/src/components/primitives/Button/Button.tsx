/**
 * Button Component
 * 
 * 原子按钮组件，支持 primary/secondary/ghost/danger 四种变体。
 * 
 * @see DESIGN_SPEC.md 3.1 Button
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '../Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否占满宽度 */
  fullWidth?: boolean;
  /** 左侧图标 */
  leftIcon?: ReactNode;
  /** 右侧图标 */
  rightIcon?: ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 子元素 */
  children?: ReactNode;
}

/**
 * 变体样式映射
 * 
 * | 变体 | 背景 | 背景(hover) | 文字色 | 边框 |
 * |------|------|-------------|--------|------|
 * | primary | #ffffff | #e0e0e0 | #080808 | none |
 * | secondary | transparent | #1a1a1a | #ffffff | 1px solid #222222 |
 * | ghost | transparent | #1a1a1a | #888888 | none |
 * | danger | transparent | #ff4444 | #ff4444 | 1px solid #ff4444 |
 */
const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: clsx(
    'bg-[var(--color-primary)]',
    'text-[var(--color-bg-body)]',
    'hover:bg-[var(--color-primary-hover)]',
    'hover:-translate-y-[1px]',
    'active:translate-y-0',
  ),
  secondary: clsx(
    'bg-transparent',
    'text-[var(--color-text-primary)]',
    'border border-[var(--color-border-default)]',
    'hover:bg-[var(--color-bg-hover)]',
    'hover:border-[var(--color-border-focus)]',
  ),
  ghost: clsx(
    'bg-transparent',
    'text-[var(--color-text-secondary)]',
    'hover:text-[var(--color-text-primary)]',
    'hover:bg-[var(--color-bg-hover)]',
  ),
  danger: clsx(
    'bg-transparent',
    'text-[var(--color-error)]',
    'border border-[var(--color-error)]',
    'hover:bg-[var(--color-error)]',
    'hover:text-[var(--color-text-primary)]',
  ),
};

/**
 * 尺寸样式映射
 * 
 * | 尺寸 | height | padding | font-size |
 * |------|--------|---------|-----------|
 * | sm | 32px | 8px 16px | 12px |
 * | md | 40px | 10px 20px | 13px |
 * | lg | 48px | 12px 24px | 14px |
 */
const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-4 text-[12px] gap-1.5',
  md: 'h-10 px-5 text-[13px] gap-2',
  lg: 'h-12 px-6 text-[14px] gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // 基础样式
          'inline-flex items-center justify-center',
          'rounded-[100px]', // pill 圆角
          'font-medium',
          'transition-all duration-[200ms]',
          'cursor-pointer',
          'select-none',
          'whitespace-nowrap',
          
          // 变体样式
          variantStyles[variant],
          
          // 尺寸样式
          sizeStyles[size],
          
          // 全宽
          fullWidth && 'w-full',
          
          // 禁用状态
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          
          // 自定义类名
          className,
        )}
        {...props}
      >
        {/* 左侧图标或加载指示器 */}
        {loading ? (
          <Spinner 
            size="sm" 
            className={variant === 'primary' ? 'text-[var(--color-bg-body)]' : undefined}
          />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        
        {/* 按钮文本 */}
        {children && <span>{children}</span>}
        
        {/* 右侧图标 */}
        {rightIcon && !loading && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
