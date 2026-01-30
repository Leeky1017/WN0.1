/**
 * SidebarSection Component
 * 
 * 侧边栏内容分组，带有可选的标题和操作按钮。
 * 
 * @see DESIGN_SPEC.md 4.3 Sidebar Content
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface SidebarSectionProps {
  /** 分组标题 */
  title?: string;
  /** 标题右侧操作 */
  action?: ReactNode;
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
 * | Section 标题 | 字号 | 10px |
 * | | 大小写 | uppercase |
 * | | 字母间距 | 0.1em |
 * | | 颜色 | #666666 |
 * | | 下边距 | 8px |
 */
export function SidebarSection({
  title,
  action,
  children,
  className,
}: SidebarSectionProps) {
  return (
    <div className={clsx('mb-6', className)}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span
            className={clsx(
              'text-[10px] uppercase tracking-[0.1em]',
              'text-[var(--color-text-tertiary)]'
            )}
          >
            {title}
          </span>
          {action}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );
}

SidebarSection.displayName = 'SidebarSection';
