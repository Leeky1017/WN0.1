/**
 * AIInput Component
 *
 * AI 面板输入组件，支持：
 * - 多行文本输入
 * - 自动高度调整
 * - 发送按钮
 * - Cmd/Ctrl + Enter 快捷键发送
 * - 加载状态时禁用
 *
 * @see DESIGN_SPEC.md 8.1.7 AI 对话流程
 */
import {
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { clsx } from 'clsx';
import { Send, Square } from 'lucide-react';

export interface AIInputProps {
  /** 当前输入值 */
  value: string;
  /** 值变更回调 */
  onChange: (value: string) => void;
  /** 发送回调 */
  onSend: () => void;
  /** 取消回调（当正在运行时） */
  onCancel?: () => void;
  /** 是否正在运行 */
  isLoading?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大行数 */
  maxRows?: number;
  /** 最小行数 */
  minRows?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 计算 textarea 行数
 */
function calculateRows(
  value: string,
  minRows: number,
  maxRows: number
): number {
  const lineCount = (value.match(/\n/g) || []).length + 1;
  return Math.min(Math.max(lineCount, minRows), maxRows);
}

export function AIInput({
  value,
  onChange,
  onSend,
  onCancel,
  isLoading = false,
  placeholder = 'Ask anything...',
  disabled = false,
  maxRows = 6,
  minRows = 1,
  className,
}: AIInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 重置高度以获取正确的 scrollHeight
    textarea.style.height = 'auto';
    // 设置新高度
    const newHeight = Math.min(textarea.scrollHeight, maxRows * 24);
    textarea.style.height = `${newHeight}px`;
  }, [value, maxRows]);

  // 处理输入变化
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter 发送
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && value.trim()) {
          onSend();
        }
        return;
      }

      // Enter 不加修饰键时发送（可选行为，当前仅在单行时）
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const rows = calculateRows(value, minRows, maxRows);
        if (rows === 1 && value.trim()) {
          e.preventDefault();
          onSend();
        }
        // 多行模式下 Enter 正常换行
      }

      // Escape 取消
      if (e.key === 'Escape' && isLoading && onCancel) {
        e.preventDefault();
        onCancel();
      }
    },
    [value, onSend, onCancel, isLoading, minRows, maxRows]
  );

  // 处理发送/取消按钮点击
  const handleButtonClick = useCallback(() => {
    if (isLoading) {
      onCancel?.();
    } else if (value.trim()) {
      onSend();
    }
  }, [isLoading, value, onSend, onCancel]);

  const isDisabled = disabled || (!isLoading && !value.trim());

  return (
    <div
      className={clsx(
        'flex items-end gap-2',
        'p-3',
        'bg-[var(--color-bg-surface)]',
        'border-t border-[var(--color-border-default)]',
        className
      )}
    >
      {/* 文本输入 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={minRows}
        className={clsx(
          'flex-1',
          'px-3 py-2',
          'bg-[var(--color-bg-body)]',
          'border border-[var(--color-border-default)]',
          'rounded-lg',
          'text-[14px]',
          'text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-tertiary)]',
          'resize-none',
          'outline-none',
          'transition-colors duration-[200ms]',
          'focus:border-[var(--color-border-focus)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // 最小高度
          'min-h-[40px]'
        )}
        style={{
          maxHeight: `${maxRows * 24}px`,
        }}
      />

      {/* 发送/取消按钮 */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isDisabled && !isLoading}
        className={clsx(
          'w-10 h-10 shrink-0',
          'flex items-center justify-center',
          'rounded-lg',
          'transition-all duration-[200ms]',

          // 正在加载时显示取消按钮
          isLoading
            ? [
                'bg-[var(--color-error)]',
                'text-white',
                'hover:bg-[var(--color-error)]/80',
              ]
            : [
                // 有内容时可点击
                value.trim()
                  ? [
                      'bg-[var(--color-primary)]',
                      'text-[var(--color-bg-body)]',
                      'hover:bg-[var(--color-primary-hover)]',
                    ]
                  : [
                      'bg-[var(--color-bg-hover)]',
                      'text-[var(--color-text-tertiary)]',
                      'cursor-not-allowed',
                    ],
              ],

          disabled && !isLoading && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={isLoading ? 'Cancel' : 'Send'}
      >
        {isLoading ? (
          // 加载中显示停止图标
          <Square className="w-4 h-4" fill="currentColor" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

AIInput.displayName = 'AIInput';

/**
 * 带有加载状态指示器的 AIInput 包装
 */
export function AIInputWithStatus({
  isLoading,
  ...props
}: AIInputProps) {
  return (
    <div className="relative">
      {/* 加载状态指示条 */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent animate-shimmer" />
        </div>
      )}
      <AIInput isLoading={isLoading} {...props} />
    </div>
  );
}
