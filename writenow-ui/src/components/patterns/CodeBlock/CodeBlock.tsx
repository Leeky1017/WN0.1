/**
 * CodeBlock Component
 * 
 * 代码块组件，支持语法高亮、行号显示、复制和应用功能。
 * 常用于 AI 聊天面板中展示代码片段。
 * 
 * @see DESIGN_SPEC.md 5.5 CodeBlock
 */
import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface CodeBlockProps {
  /** 代码内容 */
  code: string;
  /** 语言标识 */
  language?: string;
  /** 是否显示行号 */
  showLineNumbers?: boolean;
  /** 高亮行（行号数组，从 1 开始） */
  highlightLines?: number[];
  /** 最大高度 */
  maxHeight?: string;
  /** 复制回调 */
  onCopy?: () => void;
  /** 应用代码回调（AI 场景） */
  onApply?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 背景 | #1a1a1a |
 * | | 边框 | 1px solid #333333 |
 * | | 圆角 | 8px |
 * | 头部 | 背景 | #0f0f0f |
 * | | 高度 | 36px |
 * | | 内边距 | 0 12px |
 * | | 下边框 | 1px solid #333333 |
 * | 语言标签 | 字号 | 11px |
 * | | 颜色 | #666666 |
 * | | 大写 | uppercase |
 * | 操作按钮 | 尺寸 | 28px x 28px |
 * | | 图标大小 | 14px |
 * | | 颜色 | #666666 -> #ffffff (hover) |
 * | | 间距 | 4px |
 * | 代码区 | 内边距 | 16px |
 * | | 字体 | JetBrains Mono |
 * | | 字号 | 13px |
 * | | 行高 | 1.6 |
 * | | 颜色 | #e0e0e0 |
 * | 行号 | 颜色 | #444444 |
 * | | 宽度 | 40px |
 * | | 右边距 | 16px |
 * | | 对齐 | 右对齐 |
 * | 高亮行 | 背景 | rgba(255, 255, 255, 0.05) |
 */
export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightLines = [],
  maxHeight = '400px',
  onCopy,
  onApply,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.split('\n');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默处理复制失败
      console.error('Failed to copy code to clipboard');
    }
  }, [code, onCopy]);

  return (
    <div
      className={clsx(
        'border border-[var(--color-border-hover)]',
        'rounded-lg',
        'overflow-hidden',
        'bg-[var(--color-bg-hover)]',
        className,
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'h-9 px-3',
          'flex items-center justify-between',
          'bg-[var(--color-bg-surface)]',
          'border-b border-[var(--color-border-hover)]',
        )}
      >
        {/* 语言标签 */}
        <span className="text-[11px] uppercase text-[var(--color-text-tertiary)] tracking-wide">
          {language ?? 'code'}
        </span>

        {/* 操作按钮 */}
        <div className="flex gap-1">
          {/* 应用按钮（可选） */}
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className={clsx(
                'w-7 h-7',
                'flex items-center justify-center',
                'rounded',
                'text-[var(--color-text-tertiary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-border-hover)]',
                'transition-colors duration-[150ms]',
              )}
              title="Apply"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 复制按钮 */}
          <button
            type="button"
            onClick={handleCopy}
            className={clsx(
              'w-7 h-7',
              'flex items-center justify-center',
              'rounded',
              'text-[#666666]',
              'hover:text-white',
              'hover:bg-[#333333]',
              'transition-colors duration-[150ms]',
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
          'p-4',
          'overflow-auto',
          'font-mono',
          'text-[13px]',
          'leading-relaxed',
          'text-[#e0e0e0]',
        )}
        style={{ maxHeight }}
      >
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isHighlighted = highlightLines.includes(lineNumber);

          return (
            <div
              key={index}
              className={clsx(
                isHighlighted && 'bg-white/5 -mx-4 px-4',
              )}
            >
              {/* 行号 */}
              {showLineNumbers && (
                <span
                  className={clsx(
                    'inline-block',
                    'w-10',
                    'pr-4',
                    'text-right',
                    'text-[var(--color-text-tertiary)]',
                    'select-none',
                  )}
                >
                  {lineNumber}
                </span>
              )}
              {/* 代码行内容（保留空行） */}
              {line || ' '}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

CodeBlock.displayName = 'CodeBlock';
