/**
 * AIHeader Component
 *
 * AI 面板头部，包含：
 * - 模型选择下拉框
 * - 角色/技能选择下拉框
 * - 清空对话按钮
 * - 折叠面板按钮
 *
 * @see DESIGN_SPEC.md 4.5 Panel
 */
import { useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronRight, Trash2, Bot, Sparkles } from 'lucide-react';
import { Select } from '../../../components/primitives/Select';
import { Tooltip } from '../../../components/primitives/Tooltip';
import type { AIModel, AIRole } from '../../../stores/aiStore';

export interface AIHeaderProps {
  /** 当前选中的模型 ID */
  selectedModelId: string;
  /** 模型变更回调 */
  onModelChange: (modelId: string) => void;
  /** 可用模型列表 */
  models: AIModel[];
  /** 当前选中的角色 ID */
  selectedRoleId: string;
  /** 角色变更回调 */
  onRoleChange: (roleId: string) => void;
  /** 可用角色列表 */
  roles: AIRole[];
  /** 清空对话回调 */
  onClear?: () => void;
  /** 折叠面板回调 */
  onCollapse?: () => void;
  /** 是否有消息（用于决定清空按钮是否可用） */
  hasMessages?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function AIHeader({
  selectedModelId,
  onModelChange,
  models,
  selectedRoleId,
  onRoleChange,
  roles,
  onClear,
  onCollapse,
  hasMessages = false,
  className,
}: AIHeaderProps) {
  // 转换模型列表为 Select 选项
  const modelOptions = models.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  // 转换角色列表为 Select 选项
  const roleOptions = roles.map((r) => ({
    value: r.id,
    label: r.name,
  }));

  const handleClear = useCallback(() => {
    if (hasMessages && onClear) {
      onClear();
    }
  }, [hasMessages, onClear]);

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-3',
        'p-4',
        'border-b border-[var(--color-border-default)]',
        'bg-[var(--color-bg-surface)]',
        className
      )}
    >
      {/* 左侧：标题和选择器 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* AI 图标 */}
        <div
          className={clsx(
            'w-8 h-8 shrink-0',
            'flex items-center justify-center',
            'rounded-lg',
            'bg-[var(--color-bg-hover)]',
            'text-[var(--color-text-secondary)]'
          )}
        >
          <Bot className="w-4 h-4" />
        </div>

        {/* 选择器组 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* 角色选择 */}
          <div className="w-28 shrink-0">
            <Select
              value={selectedRoleId}
              onChange={onRoleChange}
              options={roleOptions}
              placeholder="Role"
            />
          </div>

          {/* 模型选择 */}
          <div className="w-28 shrink-0">
            <Select
              value={selectedModelId}
              onChange={onModelChange}
              options={modelOptions}
              placeholder="Model"
            />
          </div>
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-1 shrink-0">
        {/* 清空对话按钮 */}
        {onClear && (
          <Tooltip content="Clear conversation" side="bottom" delayDuration={300}>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasMessages}
              className={clsx(
                'w-8 h-8',
                'flex items-center justify-center',
                'rounded-lg',
                'transition-colors duration-[var(--duration-fast)]',
                hasMessages
                  ? [
                      'text-[var(--color-text-tertiary)]',
                      'hover:text-[var(--color-text-primary)]',
                      'hover:bg-[var(--color-bg-hover)]',
                    ]
                  : [
                      'text-[var(--color-text-tertiary)]',
                      'opacity-30',
                      'cursor-not-allowed',
                    ]
              )}
              aria-label="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* 折叠按钮 */}
        {onCollapse && (
          <Tooltip content="Close panel" side="bottom" delayDuration={300}>
            <button
              type="button"
              onClick={onCollapse}
              className={clsx(
                'w-8 h-8',
                'flex items-center justify-center',
                'rounded-lg',
                'text-[var(--color-text-tertiary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors duration-[var(--duration-fast)]'
              )}
              aria-label="Close panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

AIHeader.displayName = 'AIHeader';

/**
 * 简化版 AIHeader，只显示标题和折叠按钮
 */
export function AIHeaderSimple({
  title = 'AI Assistant',
  onCollapse,
  className,
}: {
  title?: string;
  onCollapse?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        'p-4',
        'border-b border-[var(--color-border-default)]',
        'bg-[var(--color-bg-surface)]',
        className
      )}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          {title}
        </h2>
      </div>

      {/* 折叠按钮 */}
      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          className={clsx(
            'w-8 h-8',
            'flex items-center justify-center',
            'rounded-lg',
            'text-[var(--color-text-tertiary)]',
            'hover:text-[var(--color-text-primary)]',
            'hover:bg-[var(--color-bg-hover)]',
            'transition-colors duration-[var(--duration-fast)]'
          )}
          aria-label="Close panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

AIHeaderSimple.displayName = 'AIHeaderSimple';
