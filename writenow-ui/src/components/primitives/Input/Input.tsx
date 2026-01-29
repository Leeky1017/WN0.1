/**
 * Input Component
 * 
 * 文本输入组件，支持 text/password/search 类型，可配置图标插槽和错误状态。
 * 
 * @see DESIGN_SPEC.md 3.2 Input
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 标签文本 */
  label?: string;
  /** 错误信息 */
  error?: string;
  /** 提示文本 */
  hint?: string;
  /** 左侧插槽 (图标) */
  leftSlot?: ReactNode;
  /** 右侧插槽 (图标/按钮) */
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftSlot,
      rightSlot,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {/* 标签 */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'text-[11px] font-medium uppercase',
              'tracking-[0.12em]',
              'text-[var(--color-text-secondary)]',
            )}
          >
            {label}
          </label>
        )}

        {/* 输入框容器 */}
        <div className="relative">
          {/* 左侧插槽 */}
          {leftSlot && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {leftSlot}
            </div>
          )}

          {/* 输入框 */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={clsx(
              // 基础样式
              'w-full h-12',
              'px-4 py-3.5',
              'bg-[var(--color-bg-surface)]',
              'border rounded-[4px]',
              'text-[14px]',
              'text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-tertiary)]',
              'outline-none',
              'transition-all duration-[300ms]',
              
              // 左侧有图标时增加内边距
              leftSlot && 'pl-11',
              
              // 右侧有图标时增加内边距
              rightSlot && 'pr-11',
              
              // 边框颜色：正常/悬停/聚焦/错误
              hasError
                ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                : clsx(
                    'border-[var(--color-border-default)]',
                    'hover:border-[var(--color-border-hover)]',
                    'focus:border-[var(--color-text-secondary)]',
                    'focus:bg-[var(--color-bg-hover)]',
                  ),
              
              // 禁用状态
              disabled && 'opacity-50 cursor-not-allowed text-[var(--color-text-tertiary)]',
              
              // 自定义类名
              className,
            )}
            {...props}
          />

          {/* 右侧插槽 */}
          {rightSlot && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
              {rightSlot}
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div
            id={`${inputId}-error`}
            role="alert"
            className="flex items-center gap-1 text-[12px] text-[var(--color-error)]"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}

        {/* 提示文本 */}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="text-[12px] text-[var(--color-text-tertiary)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
