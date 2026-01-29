/**
 * Tooltip Component
 * 
 * 工具提示组件，基于 Radix UI Tooltip。
 * 
 * @see DESIGN_SPEC.md 3.10 Tooltip
 */
import { type ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';

export interface TooltipProps {
  /** 触发元素 */
  children: ReactNode;
  /** 提示内容 */
  content: ReactNode;
  /** 显示位置 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end';
  /** 延迟显示时间（毫秒），默认 300ms */
  delayDuration?: number;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 像素规范
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 背景 | #1a1a1a |
 * | 边框 | 1px solid #333333 |
 * | 圆角 | 6px |
 * | 内边距 | 6px 10px |
 * | 字号 | 12px |
 * | 字重 | 400 |
 * | 文字色 | #ffffff |
 * | 最大宽度 | 200px |
 * | 阴影 | 0 4px 8px rgba(0, 0, 0, 0.4) |
 * | 箭头大小 | 6px |
 * | 延迟显示 | 300ms |
 * | 出现动画 | fade + scale, 150ms |
 */
export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  disabled = false,
}: TooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={delayDuration}>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className={clsx(
              // 基础样式
              'px-2.5 py-1.5',
              'rounded-[6px]',
              'bg-[var(--color-bg-hover)]',
              'border border-[var(--color-border-hover)]',
              'text-[12px] text-[var(--color-text-primary)]',
              'max-w-[200px]',
              'shadow-md',
              'z-50',
              
              // 动画
              'animate-scale-in',
              'data-[state=closed]:animate-fade-out',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow
              className="fill-[var(--color-bg-hover)]"
              width={12}
              height={6}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

Tooltip.displayName = 'Tooltip';
