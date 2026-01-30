/**
 * VersionItem Component
 * 
 * 版本历史列表项，显示时间/描述/恢复按钮。
 * 
 * @see DESIGN_SPEC.md 8.1.5 版本历史流程
 */
import { clsx } from 'clsx';
import { Clock, User, Bot, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/primitives/Button';
import { formatVersionTime, type VersionItem as VersionItemType, type VersionActor } from '../../../stores/versionStore';

export interface VersionItemProps {
  /** 版本数据 */
  version: VersionItemType;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否正在恢复 */
  isRestoring?: boolean;
  /** 点击回调 */
  onClick?: (version: VersionItemType) => void;
  /** 恢复回调 */
  onRestore?: (version: VersionItemType) => void;
}

/**
 * Actor 图标映射
 */
const ACTOR_ICONS: Record<VersionActor, React.ReactNode> = {
  user: <User className="w-3 h-3" />,
  ai: <Bot className="w-3 h-3" />,
  auto: <Clock className="w-3 h-3" />,
};

/**
 * Actor 标签映射
 */
const ACTOR_LABELS: Record<VersionActor, string> = {
  user: 'Manual',
  ai: 'AI',
  auto: 'Auto',
};

/**
 * 像素规范
 * 
 * 参照 Sidebar Item 规范：
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 容器 | 内边距 | 12px |
 * | | 边框 | 1px solid #222222 |
 * | | 圆角 | 8px |
 * | | 背景(hover) | #1a1a1a |
 * | | 背景(selected) | #1a1a1a |
 * | 时间 | 字号 | 13px |
 * | | 颜色 | #ffffff |
 * | 描述 | 字号 | 12px |
 * | | 颜色 | #888888 |
 * | Actor 标签 | 字号 | 10px |
 * | | 背景 | #1a1a1a |
 * | | 圆角 | 100px |
 */
export function VersionItem({
  version,
  isSelected = false,
  isRestoring = false,
  onClick,
  onRestore,
}: VersionItemProps) {
  const handleClick = () => {
    onClick?.(version);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore?.(version);
  };

  const formattedTime = formatVersionTime(version.createdAt);
  const actorIcon = ACTOR_ICONS[version.actor];
  const actorLabel = ACTOR_LABELS[version.actor];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={clsx(
        'group',
        'w-full',
        'p-3',
        'rounded-lg',
        'border',
        'cursor-pointer',
        'transition-all duration-[var(--duration-fast)]',
        
        isSelected
          ? 'bg-[var(--color-bg-hover)] border-[var(--color-border-focus)]'
          : 'bg-transparent border-[var(--color-border-default)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-hover)]',
          
        'focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]',
      )}
    >
      {/* 头部：时间 + Actor 标签 */}
      <div className="flex items-center justify-between mb-1">
        <span className={clsx(
          'text-[13px] font-medium',
          isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]',
        )}>
          {formattedTime}
        </span>
        
        {/* Actor 标签 */}
        <span className={clsx(
          'flex items-center gap-1',
          'px-2 py-0.5',
          'rounded-full',
          'bg-[var(--color-bg-surface)]',
          'text-[10px] text-[var(--color-text-tertiary)]',
        )}>
          {actorIcon}
          {actorLabel}
        </span>
      </div>

      {/* 名称（如果有） */}
      {version.name && (
        <div className="text-[13px] text-[var(--color-text-primary)] mb-1">
          {version.name}
        </div>
      )}

      {/* 描述/原因 */}
      {version.reason && (
        <div className="text-[12px] text-[var(--color-text-secondary)] mb-2">
          {version.reason}
        </div>
      )}

      {/* 内容预览（如果有） */}
      {version.contentPreview && (
        <div className={clsx(
          'text-[11px] text-[var(--color-text-tertiary)]',
          'line-clamp-2',
          'mb-2',
        )}>
          {version.contentPreview}
        </div>
      )}

      {/* 恢复按钮 */}
      <div className={clsx(
        'flex justify-end',
        'opacity-0 group-hover:opacity-100',
        isSelected && 'opacity-100',
        'transition-opacity duration-[var(--duration-fast)]',
      )}>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw className="w-3 h-3" />}
          onClick={handleRestore}
          loading={isRestoring}
          disabled={isRestoring}
          className="h-7 px-2.5 text-[11px]"
        >
          Restore
        </Button>
      </div>
    </div>
  );
}

VersionItem.displayName = 'VersionItem';
