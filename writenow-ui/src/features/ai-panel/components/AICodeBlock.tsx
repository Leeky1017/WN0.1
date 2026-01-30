/**
 * AICodeBlock Component
 *
 * AI 面板专用的代码块组件，基于 patterns/CodeBlock 封装，
 * 添加「应用到编辑器」功能。
 *
 * @see DESIGN_SPEC.md 5.5 CodeBlock
 * @see DESIGN_SPEC.md 6.4 CodeBlock (简化版)
 */
import { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Check, Play, FileCode } from 'lucide-react';

export interface AICodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 语言标识 */
  language?: string;
  /** 最大高度 */
  maxHeight?: string;
  /** 复制回调 */
  onCopy?: () => void;
  /** 应用到编辑器回调 */
  onApply?: (code: string) => void;
  /** 插入到光标位置回调 */
  onInsert?: (code: string) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范 (DESIGN_SPEC.md 6.4):
 *
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 背景 | #1a1a1a |
 * | | 边框 | 1px solid #222222 |
 * | | 圆角 | 8px |
 * | 头部 | 背景 | #111111 |
 * | | 字号 | 11px |
 * | | 字体 | JetBrains Mono |
 * | 代码区 | 内边距 | 12px |
 * | | 字号 | 12px |
 * | | 字体 | JetBrains Mono |
 * | 操作栏 | 上边框 | 1px solid #222222 |
 * | | 按钮字号 | 11px |
 */
export function AICodeBlock({
  code,
  language,
  maxHeight = '300px',
  onCopy,
  onApply,
  onInsert,
  className,
}: AICodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy code');
    }
  }, [code, onCopy]);

  const handleApply = useCallback(() => {
    onApply?.(code);
  }, [code, onApply]);

  const handleInsert = useCallback(() => {
    onInsert?.(code);
  }, [code, onInsert]);

  // 清理语言标识
  const displayLanguage = language?.toLowerCase().replace(/^language-/, '') ?? 'code';

  return (
    <div
      className={clsx(
        'border border-[var(--color-border-default)]',
        'rounded-lg',
        'overflow-hidden',
        'bg-[var(--color-bg-hover)]',
        className
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'h-8 px-3',
          'flex items-center justify-between',
          'bg-[#111111]',
          'border-b border-[var(--color-border-default)]'
        )}
      >
        {/* 语言标签 */}
        <span
          className={clsx(
            'text-[11px]',
            'font-mono',
            'uppercase',
            'text-[#666666]',
            'tracking-wide'
          )}
        >
          {displayLanguage}
        </span>

        {/* 头部操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 复制按钮 */}
          <button
            type="button"
            onClick={handleCopy}
            className={clsx(
              'w-6 h-6',
              'flex items-center justify-center',
              'rounded',
              'text-[#666666]',
              'hover:text-white',
              'hover:bg-[var(--color-bg-hover)]',
              'transition-colors duration-[150ms]'
            )}
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre
        className={clsx(
          'p-3',
          'overflow-auto',
          'font-mono',
          'text-[12px]',
          'leading-relaxed',
          'text-[#e0e0e0]',
          'whitespace-pre-wrap',
          'break-words'
        )}
        style={{ maxHeight }}
      >
        <code>{code}</code>
      </pre>

      {/* Action Bar */}
      {(onApply || onInsert) && (
        <div
          className={clsx(
            'px-3 py-2',
            'flex items-center justify-end gap-2',
            'border-t border-[var(--color-border-default)]',
            'bg-[#111111]'
          )}
        >
          {/* 插入按钮 */}
          {onInsert && (
            <button
              type="button"
              onClick={handleInsert}
              className={clsx(
                'h-7 px-3',
                'flex items-center gap-1.5',
                'rounded',
                'text-[11px]',
                'font-medium',
                'text-[var(--color-text-secondary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors duration-[150ms]'
              )}
            >
              <FileCode className="w-3.5 h-3.5" />
              Insert
            </button>
          )}

          {/* 应用按钮 */}
          {onApply && (
            <button
              type="button"
              onClick={handleApply}
              className={clsx(
                'h-7 px-3',
                'flex items-center gap-1.5',
                'rounded',
                'text-[11px]',
                'font-medium',
                'bg-[var(--color-primary)]',
                'text-[var(--color-bg-body)]',
                'hover:bg-[var(--color-primary-hover)]',
                'transition-colors duration-[150ms]'
              )}
            >
              <Play className="w-3.5 h-3.5" />
              Apply
            </button>
          )}
        </div>
      )}
    </div>
  );
}

AICodeBlock.displayName = 'AICodeBlock';
