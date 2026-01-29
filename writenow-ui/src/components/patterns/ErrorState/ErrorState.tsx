/**
 * ErrorState Component
 * 
 * 错误状态组件，用于显示错误信息并提供重试操作。
 * 支持图标、标题、描述和错误详情展示。
 * 
 * @see DESIGN_SPEC.md 5.3 ErrorState
 */
import { type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../../primitives';

export interface ErrorStateProps {
  /** 图标（建议使用 48px 尺寸） */
  icon?: ReactNode;
  /** 标题 */
  title?: string;
  /** 描述文字 */
  description?: string;
  /** 错误详情（Error 对象或字符串） */
  error?: Error | string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 重试按钮文案 */
  retryText?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 同 EmptyState | - |
 * | 图标 | 尺寸 | 48px |
 * | | 颜色 | #ff4444 |
 * | 标题 | 字号 | 16px |
 * | | 颜色 | #ffffff |
 * | 描述 | 字号 | 13px |
 * | | 颜色 | #888888 |
 * | 错误详情 | 背景 | #1a1a1a |
 * | | 边框 | 1px solid #333333 |
 * | | 圆角 | 4px |
 * | | 内边距 | 12px |
 * | | 字号 | 12px |
 * | | 字体 | monospace |
 * | | 颜色 | #ff6666 |
 * | | 最大高度 | 120px |
 */
export function ErrorState({
  icon,
  title = 'Something went wrong',
  description,
  error,
  onRetry,
  retryText = 'Try again',
  className,
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center',
        'p-12',
        'max-w-[400px] mx-auto',
        'text-center',
        className,
      )}
    >
      {/* 图标 */}
      <div className="w-12 h-12 mb-4 text-[var(--color-error)]">
        {icon ?? <AlertCircle className="w-full h-full" strokeWidth={1} />}
      </div>

      {/* 标题 */}
      <h3 className="text-[16px] font-medium text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
          {description}
        </p>
      )}

      {/* 错误详情 */}
      {errorMessage && (
        <pre
          className={clsx(
            'w-full p-3 mb-4',
            'bg-[#1a1a1a]',
            'border border-[#333333]',
            'rounded',
            'text-[12px]',
            'font-mono',
            'text-[#ff6666]',
            'max-h-[120px]',
            'overflow-auto',
            'text-left',
          )}
        >
          {errorMessage}
        </pre>
      )}

      {/* 重试按钮 */}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  );
}

ErrorState.displayName = 'ErrorState';
