/**
 * Dialog Component
 * 
 * 对话框组件，基于 Radix UI Dialog，支持遮罩和居中显示。
 * 
 * @see DESIGN_SPEC.md 3.12 Dialog
 */
import { type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface DialogProps {
  /** 打开状态 */
  open: boolean;
  /** 状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 内容 */
  children: ReactNode;
  /** 底部操作区 */
  footer?: ReactNode;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 内容区类名 */
  contentClassName?: string;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 遮罩 | 背景 | rgba(0, 0, 0, 0.8) |
 * | | 动画 | fade, 200ms |
 * | 容器 | 背景 | #0f0f0f |
 * | | 边框 | 1px solid #222222 |
 * | | 圆角 | 16px |
 * | | 最小宽度 | 400px |
 * | | 最大宽度 | 560px |
 * | | 内边距 | 24px |
 * | | 阴影 | 0 16px 32px rgba(0, 0, 0, 0.6) |
 * | 标题 | 字号 | 18px |
 * | | 字重 | 600 |
 * | | 颜色 | #ffffff |
 * | | 下边距 | 8px |
 * | 描述 | 字号 | 14px |
 * | | 颜色 | #888888 |
 * | | 下边距 | 24px |
 * | Footer | 上边距 | 24px |
 * | | 对齐 | flex-end |
 * | | 按钮间距 | 12px |
 * | 关闭按钮 | 位置 | 右上角 16px |
 * | | 尺寸 | 32px x 32px |
 * | | 图标大小 | 16px |
 * | | 颜色 | #666666 -> #ffffff (hover) |
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  contentClassName,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* 遮罩 */}
        <DialogPrimitive.Overlay
          className={clsx(
            'fixed inset-0',
            'bg-[var(--color-overlay)]',
            'z-50',
            'animate-fade-in',
            'data-[state=closed]:animate-fade-out',
          )}
        />

        {/* 内容 */}
        <DialogPrimitive.Content
          className={clsx(
            // 定位
            'fixed',
            'top-1/2 left-1/2',
            '-translate-x-1/2 -translate-y-1/2',
            'z-50',
            
            // 尺寸
            'w-full',
            'min-w-[400px] max-w-[560px]',
            'max-h-[85vh]',
            
            // 样式
            'p-6',
            'rounded-2xl',
            'bg-[var(--color-bg-surface)]',
            'border border-[var(--color-border-default)]',
            'shadow-xl',
            'overflow-auto',
            
            // 动画
            'animate-scale-in',
            'data-[state=closed]:animate-fade-out',
            
            // 自定义类名
            contentClassName,
          )}
        >
          {/* 关闭按钮 */}
          {showCloseButton && (
            <DialogPrimitive.Close
              className={clsx(
                'absolute top-4 right-4',
                'w-8 h-8',
                'flex items-center justify-center',
                'rounded-lg',
                'text-[var(--color-text-tertiary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors duration-[150ms]',
              )}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}

          {/* 标题 */}
          {title && (
            <DialogPrimitive.Title
              className={clsx(
                'text-[18px] font-semibold',
                'text-[var(--color-text-primary)]',
                'mb-2',
                'pr-8', // 为关闭按钮留出空间
              )}
            >
              {title}
            </DialogPrimitive.Title>
          )}

          {/* 描述 */}
          {description && (
            <DialogPrimitive.Description
              className={clsx(
                'text-[14px]',
                'text-[var(--color-text-secondary)]',
                'mb-6',
              )}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          {/* 内容 */}
          <div>{children}</div>

          {/* 底部操作区 */}
          {footer && (
            <div className="flex justify-end gap-3 mt-6">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

Dialog.displayName = 'Dialog';

// 导出 Radix 原语以支持更灵活的用法
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
