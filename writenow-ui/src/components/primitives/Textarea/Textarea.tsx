/**
 * Textarea Component
 * 
 * 多行文本输入组件，支持自动高度调整和字数统计。
 * 
 * @see DESIGN_SPEC.md 3.8 Textarea
 */
import {
  forwardRef,
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
  type ChangeEvent,
} from 'react';
import { clsx } from 'clsx';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /** 标签文本 */
  label?: string;
  /** 错误信息 */
  error?: string;
  /** 自动调整高度 */
  autoHeight?: boolean;
  /** 最大字符数 */
  maxLength?: number;
  /** 显示字数统计 */
  showCount?: boolean;
  /** 值变更回调 */
  onChange?: (value: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      autoHeight = false,
      maxLength,
      showCount = false,
      disabled,
      value,
      defaultValue,
      className,
      id,
      onChange,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasError = Boolean(error);

    // 当前值（支持受控和非受控模式）
    const currentValue = value ?? defaultValue ?? '';
    const charCount = String(currentValue).length;

    // 自动调整高度
    useEffect(() => {
      if (autoHeight && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`;
      }
    }, [autoHeight, currentValue, textareaRef]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

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

        {/* 文本域容器 */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={inputId}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            maxLength={maxLength}
            rows={rows}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={handleChange}
            className={clsx(
              // 基础样式
              'w-full min-h-[80px]',
              'p-3',
              'bg-[var(--color-bg-surface)]',
              'border rounded-[4px]',
              'text-[14px] leading-relaxed',
              'text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-tertiary)]',
              'outline-none',
              'resize-none',
              'transition-all duration-[300ms]',
              
              // 有字数统计时增加底部内边距
              showCount && 'pb-8',
              
              // 边框颜色
              hasError
                ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                : clsx(
                    'border-[var(--color-border-default)]',
                    'hover:border-[var(--color-border-hover)]',
                    'focus:border-[var(--color-text-secondary)]',
                  ),
              
              // 禁用状态
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-body)] border-[var(--color-bg-hover)]',
              
              // 自定义类名
              className,
            )}
            {...props}
          />

          {/* 字数统计 */}
          {showCount && (
            <div
              className={clsx(
                'absolute right-2 bottom-2',
                'text-[11px]',
                maxLength && charCount > maxLength
                  ? 'text-[var(--color-error)]'
                  : 'text-[#666666]',
              )}
            >
              {charCount}
              {maxLength && `/${maxLength}`}
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
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
