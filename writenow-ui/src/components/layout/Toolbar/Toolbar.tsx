/**
 * Toolbar Component
 * 
 * 顶部工具栏，支持 60px (default) 和 80px (large) 两种高度。
 * 提供 left、center、right 三个插槽。
 * 
 * @see DESIGN_SPEC.md 4.4 Toolbar
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export type ToolbarSize = 'default' | 'large';

export interface ToolbarProps {
  /** 尺寸变体 */
  size?: ToolbarSize;
  /** 左侧内容 */
  left?: ReactNode;
  /** 中间内容 */
  center?: ReactNode;
  /** 右侧内容 */
  right?: ReactNode;
  /** 是否显示下边框 */
  showBorder?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子内容（替代 left/center/right 模式） */
  children?: ReactNode;
}

/**
 * 像素规范
 * 
 * | 尺寸 | 高度 | 内边距 |
 * |------|------|--------|
 * | default | 60px | 0 24px |
 * | large | 80px | 0 48px |
 * 
 * 通用样式:
 * - 下边框: 1px solid #222222
 * - 布局: flex justify-between items-center
 */
export function Toolbar({
  size = 'default',
  left,
  center,
  right,
  showBorder = true,
  className,
  children,
}: ToolbarProps) {
  // 如果传入 children，使用自由布局模式
  if (children) {
    return (
      <div
        className={clsx(
          'shrink-0',
          // 尺寸
          size === 'large' ? 'h-20 px-12' : 'h-[60px] px-6',
          // 布局
          'flex items-center',
          // 边框
          showBorder && 'border-b border-[var(--color-border-default)]',
          // 背景
          'bg-[var(--color-bg-body)]',
          className
        )}
      >
        {children}
      </div>
    );
  }

  // 三栏布局模式
  return (
    <div
      className={clsx(
        'shrink-0',
        // 尺寸
        size === 'large' ? 'h-20 px-12' : 'h-[60px] px-6',
        // 布局
        'flex items-center justify-between',
        // 边框
        showBorder && 'border-b border-[var(--color-border-default)]',
        // 背景
        'bg-[var(--color-bg-body)]',
        className
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-3 shrink-0">
        {left}
      </div>

      {/* Center */}
      {center && (
        <div className="flex items-center justify-center flex-1 mx-4">
          {center}
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {right}
      </div>
    </div>
  );
}

Toolbar.displayName = 'Toolbar';

// ============================================================================
// ToolbarGroup (辅助组件)
// ============================================================================

export interface ToolbarGroupProps {
  /** 子内容 */
  children: ReactNode;
  /** 元素间距 */
  gap?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * 工具栏分组组件，用于组织相关的工具栏项
 */
export function ToolbarGroup({
  children,
  gap = 'sm',
  className,
}: ToolbarGroupProps) {
  const gapClass = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  }[gap];

  return (
    <div className={clsx('flex items-center', gapClass, className)}>
      {children}
    </div>
  );
}

ToolbarGroup.displayName = 'ToolbarGroup';

// ============================================================================
// ToolbarDivider (辅助组件)
// ============================================================================

export interface ToolbarDividerProps {
  /** 自定义类名 */
  className?: string;
}

/**
 * 工具栏分隔线
 */
export function ToolbarDivider({ className }: ToolbarDividerProps) {
  return (
    <div
      className={clsx(
        'w-px h-5 bg-[var(--color-border-default)] mx-2',
        className
      )}
      aria-hidden="true"
    />
  );
}

ToolbarDivider.displayName = 'ToolbarDivider';
