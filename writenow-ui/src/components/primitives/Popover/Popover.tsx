/**
 * Popover Component
 * 
 * 弹出层组件，基于 Radix UI Popover。
 * 
 * @see DESIGN_SPEC.md 3.11 Popover
 */
import { type ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { clsx } from 'clsx';

export interface PopoverProps {
  /** 触发元素 */
  trigger: ReactNode;
  /** 弹出内容 */
  content: ReactNode;
  /** 显示位置 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end';
  /** 打开状态（受控） */
  open?: boolean;
  /** 状态变更回调（受控） */
  onOpenChange?: (open: boolean) => void;
  /** 默认打开状态（非受控） */
  defaultOpen?: boolean;
  /** 内容区类名 */
  contentClassName?: string;
}

/**
 * 像素规范
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 背景 | #0f0f0f |
 * | 边框 | 1px solid #222222 |
 * | 圆角 | 8px |
 * | 内边距 | 12px |
 * | 最小宽度 | 200px |
 * | 最大宽度 | 320px |
 * | 阴影 | 0 8px 16px rgba(0, 0, 0, 0.5) |
 * | 出现动画 | fade + translateY(4px), 200ms |
 */
export function Popover({
  trigger,
  content,
  side = 'bottom',
  align = 'center',
  open,
  onOpenChange,
  defaultOpen,
  contentClassName,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
    >
      <PopoverPrimitive.Trigger asChild>
        {trigger}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          className={clsx(
            // 基础样式
            'p-3',
            'min-w-[200px] max-w-[320px]',
            'rounded-lg',
            'bg-[var(--color-bg-surface)]',
            'border border-[var(--color-border-default)]',
            'shadow-lg',
            'z-50',
            'outline-none',
            
            // 动画
            'animate-scale-in',
            'data-[state=closed]:animate-fade-out',
            
            // 自定义类名
            contentClassName,
          )}
        >
          {content}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

Popover.displayName = 'Popover';
