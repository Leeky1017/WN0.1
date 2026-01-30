/**
 * SkillsPanel Component
 * 
 * 技能面板，显示可用技能列表，支持搜索/分类过滤/开关控制。
 * 按 AI Panel 风格推导实现。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Skills Panel 参照 AI Panel
 */
import { useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { X, Sparkles, Search } from 'lucide-react';
import { Input } from '../../components/primitives/Input';
import { Select } from '../../components/primitives/Select';
import { LoadingState } from '../../components/patterns/LoadingState';
import { EmptyState } from '../../components/patterns/EmptyState';
import { SkillItem } from './components/SkillItem';
import { 
  useSkillsStore, 
  SKILL_CATEGORIES,
  type SkillCategory,
} from '../../stores/skillsStore';

export interface SkillsPanelProps {
  /** 折叠回调 */
  onCollapse?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 分类选项
 */
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(SKILL_CATEGORIES).map(([value, { label }]) => ({
    value,
    label,
  })),
];

/**
 * 像素规范
 * 
 * 参照 AI Panel 规范：
 * | 属性 | 值 |
 * |------|-----|
 * | 宽度 | 360px |
 * | 背景 | #0f0f0f |
 * | 左边框 | 1px solid #222222 |
 */
export function SkillsPanel({
  onCollapse,
  className,
}: SkillsPanelProps) {
  const {
    isLoading,
    error,
    searchQuery,
    categoryFilter,
    selectedSkillId,
    fetchSkills,
    toggleSkill,
    selectSkill,
    setSearchQuery,
    setCategoryFilter,
    getFilteredSkills,
  } = useSkillsStore();

  // 加载技能列表
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const filteredSkills = getFilteredSkills();

  /**
   * 处理搜索
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  /**
   * 处理分类筛选
   */
  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value as SkillCategory | 'all');
  }, [setCategoryFilter]);

  /**
   * 处理技能点击
   */
  const handleSkillClick = useCallback((skillId: string) => {
    selectSkill(selectedSkillId === skillId ? null : skillId);
  }, [selectedSkillId, selectSkill]);

  /**
   * 处理开关切换
   */
  const handleToggle = useCallback((skillId: string, enabled: boolean) => {
    toggleSkill(skillId, enabled);
  }, [toggleSkill]);

  // 统计启用的技能数
  const enabledCount = filteredSkills.filter((s) => s.enabled).length;

  return (
    <div
      className={clsx(
        'h-full flex flex-col',
        'bg-[var(--color-bg-surface)]',
        'border-l border-[var(--color-border-default)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Skills
          </h2>
          {/* 启用数量标签 */}
          <span className={clsx(
            'px-1.5 py-0.5',
            'rounded-full',
            'bg-[var(--color-bg-hover)]',
            'text-[10px] text-[var(--color-text-secondary)]',
          )}>
            {enabledCount} active
          </span>
        </div>
        
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className={clsx(
              'w-7 h-7',
              'flex items-center justify-center',
              'rounded-lg',
              'text-[var(--color-text-tertiary)]',
              'hover:text-[var(--color-text-primary)]',
              'hover:bg-[var(--color-bg-hover)]',
              'transition-colors duration-[var(--duration-fast)]',
            )}
            aria-label="Close panel"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* 搜索和筛选 */}
      <div className="p-4 space-y-3 shrink-0 border-b border-[var(--color-border-default)]">
        {/* 搜索框 */}
        <Input
          type="search"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={handleSearchChange}
          leftSlot={<Search className="w-4 h-4" />}
          className="h-9"
        />
        
        {/* 分类选择 */}
        <Select
          value={categoryFilter}
          options={CATEGORY_OPTIONS}
          onChange={handleCategoryChange}
          placeholder="Filter by category"
        />
      </div>

      {/* 技能列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 加载状态 */}
        {isLoading && (
          <div className="py-8">
            <LoadingState text="Loading skills..." />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="py-8 text-center text-[13px] text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && filteredSkills.length === 0 && (
          <EmptyState
            icon={<Sparkles className="w-12 h-12" />}
            title={searchQuery ? 'No skills found' : 'No skills available'}
            description={
              searchQuery
                ? 'Try adjusting your search or filter'
                : 'Skills will appear here when available'
            }
          />
        )}

        {/* 技能列表 */}
        {!isLoading && !error && filteredSkills.length > 0 && (
          <div className="space-y-2">
            {filteredSkills.map((skill) => (
              <SkillItem
                key={skill.id}
                skill={skill}
                isSelected={selectedSkillId === skill.id}
                onToggle={(enabled) => handleToggle(skill.id, enabled)}
                onClick={() => handleSkillClick(skill.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer 提示 */}
      <div className="p-4 shrink-0 border-t border-[var(--color-border-default)]">
        <p className="text-[11px] text-[var(--color-text-tertiary)] text-center">
          Enable skills to enhance AI capabilities
        </p>
      </div>
    </div>
  );
}

SkillsPanel.displayName = 'SkillsPanel';
