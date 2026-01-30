/**
 * IconBar Component
 * 
 * 48px 宽的图标导航条，位于应用最左侧，始终可见。
 * 
 * @see DESIGN_SPEC.md 4.2 Icon Bar
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { PanelLeft } from 'lucide-react';
import { Tooltip } from '../../primitives/Tooltip';

export interface IconBarItem {
  /** 唯一标识 */
  id: string;
  /** 图标 */
  icon: ReactNode;
  /** Tooltip 显示的文字 */
  label: string;
  /** 可选的徽章 */
  badge?: number | string;
}

export interface IconBarProps {
  /** 导航项列表 */
  items: IconBarItem[];
  /** 当前激活项 ID */
  activeId: string;
  /** 选择导航项回调 */
  onSelect: (id: string) => void;
  /** 折叠/展开 Sidebar 回调 */
  onToggleSidebar: () => void;
  /** 底部导航项（如设置） */
  bottomItems?: IconBarItem[];
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 宽度 | 48px |
 * | | 背景 | #080808 |
 * | | 内边距 | 8px 0 |
 * | 图标按钮 | 尺寸 | 40px × 40px |
 * | | 圆角 | 8px |
 * | | 图标大小 | 20px |
 * | | 颜色(默认) | #666666 |
 * | | 颜色(hover) | #ffffff |
 * | | 颜色(active) | #ffffff |
 * | | 背景(hover) | #1a1a1a |
 * | | 背景(active) | #222222 |
 * | 活动指示器 | 位置 | 左侧 2px |
 * | | 宽度 | 2px |
 * | | 高度 | 20px |
 * | | 颜色 | #ffffff |
 * | | 圆角 | 1px |
 */
export function IconBar({
  items,
  activeId,
  onSelect,
  onToggleSidebar,
  bottomItems,
  className,
}: IconBarProps) {
  return (
    <div
      className={clsx(
        // 布局
        'w-12 h-full shrink-0',
        'flex flex-col py-2',
        // 样式
        'bg-[var(--color-bg-body)]',
        'border-r border-[var(--color-border-default)]',
        className
      )}
    >
      {/* Toggle Sidebar Button */}
      <Tooltip content="Toggle Sidebar" side="right" delayDuration={300}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={clsx(
            // 尺寸和布局
            'w-10 h-10 mx-auto mb-2',
            'flex items-center justify-center',
            'rounded-lg',
            // 颜色和过渡
            'text-[var(--color-text-tertiary)]',
            'hover:text-[var(--color-text-primary)]',
            'hover:bg-[var(--color-bg-hover)]',
            'transition-colors duration-[var(--duration-fast)]'
          )}
          aria-label="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </Tooltip>

      {/* Divider */}
      <div className="h-px bg-[var(--color-border-default)] mx-2 my-2" />

      {/* Main Items */}
      <div className="flex-1 flex flex-col gap-1">
        {items.map((item) => (
          <IconBarButton
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>

      {/* Bottom Items */}
      {bottomItems && bottomItems.length > 0 && (
        <div className="flex flex-col gap-1 mt-auto">
          {bottomItems.map((item) => (
            <IconBarButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

IconBar.displayName = 'IconBar';

// ============================================================================
// IconBarButton (内部组件)
// ============================================================================

interface IconBarButtonProps {
  item: IconBarItem;
  isActive: boolean;
  onClick: () => void;
}

function IconBarButton({ item, isActive, onClick }: IconBarButtonProps) {
  return (
    <Tooltip content={item.label} side="right" delayDuration={300}>
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          // 定位
          'relative',
          // 尺寸和布局
          'w-10 h-10 mx-auto',
          'flex items-center justify-center',
          'rounded-lg',
          // 过渡
          'transition-colors duration-[var(--duration-fast)]',
          // 状态样式
          isActive
            ? 'text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]'
            : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
        )}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Active Indicator */}
        {isActive && (
          <div
            className={clsx(
              'absolute left-0 top-1/2 -translate-y-1/2',
              'w-0.5 h-5',
              'bg-[var(--color-text-primary)]',
              'rounded-r'
            )}
            aria-hidden="true"
          />
        )}

        {/* Icon */}
        <span className="w-5 h-5 [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-[1.5]">
          {item.icon}
        </span>

        {/* Badge */}
        {item.badge !== undefined && (
          <span
            className={clsx(
              'absolute -top-1 -right-1',
              'min-w-[16px] h-4',
              'bg-[var(--color-primary)]',
              'text-[var(--color-bg-body)]',
              'text-[10px] font-medium',
              'rounded-full',
              'flex items-center justify-center',
              'px-1'
            )}
          >
            {item.badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
