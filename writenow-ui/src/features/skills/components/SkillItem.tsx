/**
 * SkillItem Component
 * 
 * 技能列表项，显示技能信息和开关。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Skills Panel 参照 AI Panel
 */
import { clsx } from 'clsx';
import { Switch } from '../../../components/primitives/Switch';
import { 
  Sparkles, 
  Search, 
  FileEdit, 
  FileText, 
  Puzzle,
  ChevronRight,
} from 'lucide-react';
import { type Skill, type SkillCategory } from '../../../stores/skillsStore';

export interface SkillItemProps {
  /** 技能数据 */
  skill: Skill;
  /** 是否选中 */
  isSelected?: boolean;
  /** 切换开关回调 */
  onToggle: (enabled: boolean) => void;
  /** 点击回调（查看详情） */
  onClick?: () => void;
}

/**
 * 分类图标映射
 */
const CATEGORY_ICONS: Record<SkillCategory, React.ReactNode> = {
  writing: <Sparkles className="w-4 h-4" />,
  research: <Search className="w-4 h-4" />,
  editing: <FileEdit className="w-4 h-4" />,
  formatting: <FileText className="w-4 h-4" />,
  custom: <Puzzle className="w-4 h-4" />,
};

/**
 * 像素规范
 * 
 * 参照 AI Panel MessageBubble 风格：
 * | 属性 | 值 |
 * |------|-----|
 * | 内边距 | 12px |
 * | 边框 | 1px solid #222222 |
 * | 圆角 | 8px |
 * | 背景(hover) | #1a1a1a |
 */
export function SkillItem({
  skill,
  isSelected = false,
  onToggle,
  onClick,
}: SkillItemProps) {
  const handleToggle = (checked: boolean) => {
    onToggle(checked);
  };

  const handleClick = () => {
    onClick?.();
  };

  const categoryIcon = CATEGORY_ICONS[skill.category];

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
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={clsx(
          'w-8 h-8 shrink-0',
          'flex items-center justify-center',
          'rounded-lg',
          'bg-[var(--color-bg-surface)]',
          skill.enabled 
            ? 'text-[var(--color-text-primary)]' 
            : 'text-[var(--color-text-tertiary)]',
        )}>
          {categoryIcon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 名称 */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className={clsx(
              'text-[13px] font-medium truncate',
              skill.enabled
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)]',
            )}>
              {skill.name}
            </span>
            
            {/* 版本号 */}
            {skill.version && (
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                v{skill.version}
              </span>
            )}
          </div>
          
          {/* 描述 */}
          <p className={clsx(
            'text-[12px] line-clamp-2',
            skill.enabled
              ? 'text-[var(--color-text-secondary)]'
              : 'text-[var(--color-text-tertiary)]',
          )}>
            {skill.description}
          </p>
        </div>

        {/* 开关 + 箭头 */}
        <div className="flex items-center gap-2 shrink-0">
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={skill.enabled}
              onChange={handleToggle}
            />
          </div>
          
          <ChevronRight className={clsx(
            'w-4 h-4',
            'text-[var(--color-text-tertiary)]',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-[var(--duration-fast)]',
          )} />
        </div>
      </div>
    </div>
  );
}

SkillItem.displayName = 'SkillItem';
