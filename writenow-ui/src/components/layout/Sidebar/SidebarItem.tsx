/**
 * SidebarItem Component
 * 
 * 侧边栏导航项，支持图标、徽章和活动状态。
 * 
 * @see DESIGN_SPEC.md 4.3 Sidebar Content
 */
import { type ReactNode, forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SidebarItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** 是否为活动状态 */
  active?: boolean;
  /** 左侧图标 */
  icon?: ReactNode;
  /** 右侧徽章 */
  badge?: ReactNode;
  /** 是否有缩进（用于嵌套项） */
  indent?: boolean;
  /** 文本内容 */
  children: ReactNode;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 列表项 | 字号 | 13px |
 * | | 颜色(默认) | #888888 |
 * | | 颜色(hover) | #ffffff |
 * | | 颜色(active) | #ffffff |
 * | | 内边距 | 6px 8px |
 * | | 圆角 | 4px |
 * | | 背景(hover) | #1a1a1a |
 * | | 背景(active) | #222222 |
 */
export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(
  function SidebarItem(
    { active, icon, badge, indent, children, className, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          // 用于 hover 控制子元素
          'group relative',
          // 布局
          'w-full',
          'flex items-center gap-2',
          'px-2 py-1.5',
          'rounded',
          // 文字
          'text-[13px] text-left',
          // 过渡
          'transition-colors duration-[var(--duration-fast)]',
          // 缩进
          indent && 'pl-6',
          // 状态样式
          active
            ? 'nav-item-active text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
          className
        )}
        aria-current={active ? 'page' : undefined}
        {...props}
      >
        {/* + 指示器 - Variant 设计语言核心视觉识别符 */}
        <span className="nav-item-indicator absolute -left-3 text-[var(--color-text-tertiary)] font-light text-sm">
          +
        </span>
        
        {icon && (
          <span className="w-4 h-4 shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:stroke-[1.5]">
            {icon}
          </span>
        )}
        <span className="flex-1 truncate">
          {children}
        </span>
        {badge && (
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            {badge}
          </span>
        )}
      </button>
    );
  }
);

SidebarItem.displayName = 'SidebarItem';
