/**
 * EmptyState Component
 * 
 * 空状态组件，用于显示列表/内容为空时的占位 UI。
 * 支持图标、标题、描述和操作按钮。
 * 
 * @see DESIGN_SPEC.md 5.1 EmptyState
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Button } from '../../primitives';

export interface EmptyStateAction {
  /** 按钮文案 */
  label: string;
  /** 点击回调 */
  onClick: () => void;
  /** 按钮变体 */
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateProps {
  /** 图标（建议使用 48px 尺寸） */
  icon?: ReactNode;
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮 */
  action?: EmptyStateAction;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 对齐 | 水平垂直居中 |
 * | | 内边距 | 48px |
 * | | 最大宽度 | 320px |
 * | 图标 | 尺寸 | 48px |
 * | | 颜色 | #444444 |
 * | | 下边距 | 16px |
 * | 标题 | 字号 | 16px |
 * | | 字重 | 500 |
 * | | 颜色 | #888888 |
 * | | 下边距 | 8px |
 * | 描述 | 字号 | 13px |
 * | | 颜色 | #666666 |
 * | | 行高 | 1.5 |
 * | | 下边距 | 24px |
 * | 操作按钮 | 使用 | Button 组件 |
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center',
        'p-12',
        'max-w-[320px] mx-auto',
        'text-center',
        className,
      )}
    >
      {/* 图标 */}
      {icon && (
        <div className="w-12 h-12 mb-4 text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}

      {/* 标题 */}
      <h3 className="text-[16px] font-medium text-[var(--color-text-secondary)] mb-2">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="text-[13px] text-[#666666] leading-relaxed mb-6">
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {action && (
        <Button
          variant={action.variant ?? 'secondary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';
