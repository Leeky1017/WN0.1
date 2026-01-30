/**
 * LoadingState & Skeleton Components
 * 
 * 加载状态组件，支持 Spinner 和骨架屏（Shimmer）两种模式。
 * 
 * @see DESIGN_SPEC.md 5.2 LoadingState
 */
import { type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Spinner } from '../../primitives';

/* ==========================================================================
   Skeleton Component
   ========================================================================== */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 圆角 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** 是否启用动画 */
  animate?: boolean;
}

/**
 * 骨架屏像素规范
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 背景色 | #1a1a1a |
 * | 动画高亮色 | #222222 |
 * | 动画方向 | 从左到右 |
 * | 动画时长 | 1.5s |
 * | 动画类型 | shimmer, infinite |
 */
const roundedStyles: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  width = '100%',
  height = '16px',
  rounded = 'sm',
  animate = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        'bg-[var(--color-bg-hover)]',
        roundedStyles[rounded],
        animate && 'animate-shimmer',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

Skeleton.displayName = 'Skeleton';

/* ==========================================================================
   LoadingState Component
   ========================================================================== */

export interface LoadingStateProps {
  /** 加载模式：spinner 或 skeleton */
  variant?: 'spinner' | 'skeleton';
  /** 加载提示文字（仅 spinner 模式） */
  text?: string;
  /** 是否全屏显示 */
  fullscreen?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * LoadingState 像素规范
 * 
 * **Spinner 模式:**
 * | 属性 | 值 |
 * |------|-----|
 * | Spinner 尺寸 | lg (32px) |
 * | 文字字号 | 13px |
 * | 文字颜色 | #888888 |
 * | 间距 | 12px |
 * 
 * **Skeleton 骨架屏:**
 * | 属性 | 值 |
 * |------|-----|
 * | 背景色 | #1a1a1a |
 * | 动画高亮色 | #222222 |
 * | 动画方向 | 从左到右 |
 * | 动画时长 | 1.5s |
 * | 动画类型 | shimmer, infinite |
 */
export function LoadingState({
  variant = 'spinner',
  text,
  fullscreen = false,
  className,
}: LoadingStateProps) {
  const content =
    variant === 'spinner' ? (
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {text && (
          <span className="text-[13px] text-[var(--color-text-secondary)]">
            {text}
          </span>
        )}
      </div>
    ) : (
      <div className={clsx('space-y-3', className)}>
        <Skeleton height="24px" width="60%" />
        <Skeleton height="16px" />
        <Skeleton height="16px" />
        <Skeleton height="16px" width="80%" />
      </div>
    );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg-body)] z-50">
        {content}
      </div>
    );
  }

  // Spinner 模式下居中显示
  if (variant === 'spinner') {
    return (
      <div className={clsx('flex items-center justify-center p-8', className)}>
        {content}
      </div>
    );
  }

  return content;
}

LoadingState.displayName = 'LoadingState';
