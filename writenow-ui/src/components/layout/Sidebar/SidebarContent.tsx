/**
 * SidebarContent Component
 * 
 * Icon Bar 展开后显示的侧边栏内容区，可折叠。
 * 
 * @see DESIGN_SPEC.md 4.3 Sidebar Content
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft } from 'lucide-react';

export interface SidebarContentProps {
  /** 标题 */
  title: string;
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
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 默认宽度 | 240px |
 * | | 最小宽度 | 180px |
 * | | 最大宽度 | 400px |
 * | | 背景 | #080808 |
 * | | 内边距 | 16px |
 * | 头部标题 | 字号 | 12px |
 * | | 字重 | 600 |
 * | | 颜色 | #ffffff |
 * | | 下边距 | 16px |
 */
export function SidebarContent({
  title,
  onCollapse,
  showCollapseButton = true,
  headerAction,
  children,
  className,
}: SidebarContentProps) {
  return (
    <div
      className={clsx(
        'h-full flex flex-col p-4 overflow-hidden',
        'bg-[var(--color-bg-body)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-[12px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
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
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

SidebarContent.displayName = 'SidebarContent';
