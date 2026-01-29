/**
 * Panel Component
 * 
 * 右侧面板，可折叠，支持普通 (280px) 和 AI (360px) 两种变体。
 * 
 * @see DESIGN_SPEC.md 4.5 Panel
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';

export type PanelVariant = 'default' | 'ai';

export interface PanelProps {
  /** 面板变体 */
  variant?: PanelVariant;
  /** 标题 */
  title?: string;
  /** 是否显示头部 */
  showHeader?: boolean;
  /** 折叠回调 */
  onCollapse?: () => void;
  /** 是否显示折叠按钮 */
  showCollapseButton?: boolean;
  /** 头部右侧额外操作 */
  headerAction?: ReactNode;
  /** 子内容 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 默认宽度 | 280px (普通) / 360px (AI) |
 * | 最小宽度 | 240px |
 * | 最大宽度 | 480px |
 * | 背景 | #080808 (普通) / #0f0f0f (AI) |
 * | 左边框 | 1px solid #222222 |
 * | 内边距 | 16px |
 * 
 * 折叠按钮:
 * | 属性 | 值 |
 * |------|-----|
 * | 位置 | 面板头部右侧 |
 * | 图标 | chevron-right (展开时) |
 * | 尺寸 | 24px × 24px |
 * | 颜色 | #444444 → #ffffff (hover) |
 */
export function Panel({
  variant = 'default',
  title,
  showHeader = true,
  onCollapse,
  showCollapseButton = true,
  headerAction,
  children,
  className,
}: PanelProps) {
  return (
    <div
      className={clsx(
        'h-full flex flex-col overflow-hidden',
        // 背景根据变体不同
        variant === 'ai'
          ? 'bg-[var(--color-bg-surface)]'
          : 'bg-[var(--color-bg-body)]',
        className
      )}
    >
      {/* Header */}
      {showHeader && (title || showCollapseButton || headerAction) && (
        <div className="flex items-center justify-between p-4 shrink-0">
          {title && (
            <h2 className="text-[12px] font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
          )}
          {!title && <div />}
          <div className="flex items-center gap-1">
            {headerAction}
            {showCollapseButton && onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className={clsx(
                  'w-6 h-6',
                  'flex items-center justify-center',
                  'rounded',
                  'text-[var(--color-text-tertiary)]',
                  'hover:text-[var(--color-text-primary)]',
                  'hover:bg-[var(--color-bg-hover)]',
                  'transition-colors duration-[var(--duration-fast)]'
                )}
                aria-label="Collapse panel"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={clsx(
          'flex-1 overflow-y-auto',
          // 如果没有 header，顶部也需要 padding
          !showHeader && 'pt-4',
          'px-4 pb-4'
        )}
      >
        {children}
      </div>
    </div>
  );
}

Panel.displayName = 'Panel';
