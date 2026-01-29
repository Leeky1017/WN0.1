/**
 * ConfirmDialog Component
 * 
 * 确认对话框组件，用于危险操作确认。
 * 基于 Dialog 组件，提供标准化的确认/取消交互。
 * 
 * @see DESIGN_SPEC.md 5.4 ConfirmDialog
 */
import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { Dialog, Button } from '../../primitives';

export interface ConfirmDialogProps {
  /** 打开状态 */
  open: boolean;
  /** 状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 变体：default 或 danger（危险操作） */
  variant?: 'default' | 'danger';
  /** 确认回调（支持异步） */
  onConfirm: () => void | Promise<void>;
  /** 外部控制的加载状态 */
  loading?: boolean;
}

/**
 * 像素规范
 * 
 * | 变体 | 确认按钮样式 |
 * |------|--------------|
 * | default | primary |
 * | danger | danger (红色边框 + 红色文字) |
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 宽度 | 固定 | 400px |
 * | 标题 | 字号 | 18px |
 * | | 字重 | 600 |
 * | 描述 | 字号 | 14px |
 * | | 颜色 | #888888 |
 * | | 行高 | 1.5 |
 * | Footer | 对齐 | flex-end |
 * | | 按钮间距 | 12px |
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  loading: externalLoading,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = useCallback(async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setInternalLoading(false);
    }
  }, [onConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false);
    }
  }, [isLoading, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      contentClassName="w-[400px] max-w-[400px]"
    >
      {/* 标题 */}
      <h2
        className={clsx(
          'text-[18px] font-semibold',
          'text-[var(--color-text-primary)]',
          'mb-2',
        )}
      >
        {title}
      </h2>

      {/* 描述 */}
      {description && (
        <p
          className={clsx(
            'text-[14px]',
            'text-[var(--color-text-secondary)]',
            'leading-relaxed',
            'mb-6',
          )}
        >
          {description}
        </p>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}

ConfirmDialog.displayName = 'ConfirmDialog';
