/**
 * SearchResultItem Component
 * 
 * 搜索结果列表项，显示标题、内容摘要和匹配高亮。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - 按 Sidebar 导航风格
 */
import { clsx } from 'clsx';
import { FileText, FolderOpen, User, List, ChevronRight } from 'lucide-react';
import { type SearchResult, type SearchResultType, RESULT_TYPES } from '../../../stores/searchStore';

export interface SearchResultItemProps {
  /** 搜索结果数据 */
  result: SearchResult;
  /** 是否选中 */
  isSelected?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 类型图标映射
 */
const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  project: <FolderOpen className="w-4 h-4" />,
  character: <User className="w-4 h-4" />,
  outline: <List className="w-4 h-4" />,
};

/**
 * 像素规范
 * 
 * 参照 Sidebar Item 规范：
 * | 属性 | 值 |
 * |------|-----|
 * | 内边距 | 12px |
 * | 边框 | 1px solid #222222 |
 * | 圆角 | 8px |
 */
export function SearchResultItem({
  result,
  isSelected = false,
  onClick,
}: SearchResultItemProps) {
  const typeIcon = TYPE_ICONS[result.type];
  const typeLabel = RESULT_TYPES[result.type].label;
  const scorePercent = Math.round(result.score * 100);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
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
      <div className="flex items-start gap-3">
        {/* 类型图标 */}
        <div className={clsx(
          'w-8 h-8 shrink-0',
          'flex items-center justify-center',
          'rounded-lg',
          'bg-[var(--color-bg-surface)]',
          'text-[var(--color-text-secondary)]',
        )}>
          {typeIcon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
              {result.title}
            </span>
          </div>
          
          {/* 高亮摘要 */}
          {result.highlight && (
            <p
              className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mb-1"
              dangerouslySetInnerHTML={{ __html: result.highlight }}
            />
          )}
          
          {/* 元信息 */}
          <div className="flex items-center gap-2">
            {/* 类型标签 */}
            <span className={clsx(
              'px-1.5 py-0.5',
              'rounded-full',
              'bg-[var(--color-bg-surface)]',
              'text-[9px] text-[var(--color-text-tertiary)]',
            )}>
              {typeLabel}
            </span>
            
            {/* 项目名称 */}
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {result.projectName}
            </span>
            
            {/* 相关度 */}
            <span className={clsx(
              'ml-auto',
              'text-[10px]',
              scorePercent >= 80
                ? 'text-[var(--color-success)]'
                : scorePercent >= 50
                ? 'text-[var(--color-warning)]'
                : 'text-[var(--color-text-tertiary)]',
            )}>
              {scorePercent}%
            </span>
          </div>
        </div>

        {/* 箭头 */}
        <ChevronRight className={clsx(
          'w-4 h-4 shrink-0',
          'text-[var(--color-text-tertiary)]',
          'opacity-0 group-hover:opacity-100',
          isSelected && 'opacity-100',
          'transition-opacity duration-[var(--duration-fast)]',
        )} />
      </div>
    </div>
  );
}

SearchResultItem.displayName = 'SearchResultItem';
