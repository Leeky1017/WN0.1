/**
 * MemoryItem Component
 * 
 * 记忆列表项，显示记忆内容，支持编辑和删除。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Memory Panel 参照 Context Panel
 */
import { useState } from 'react';
import { clsx } from 'clsx';
import { Pencil, Trash2, Check, X, Brain, MessageSquare, Palette } from 'lucide-react';
import { Button } from '../../../components/primitives/Button';
import { Textarea } from '../../../components/primitives/Textarea';
import { 
  type Memory, 
  type MemoryType, 
  type MemoryOrigin,
  formatMemoryTime,
} from '../../../stores/memoryStore';

export interface MemoryItemProps {
  /** 记忆数据 */
  memory: Memory;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否正在编辑 */
  isEditing?: boolean;
  /** 编辑内容 */
  editingContent?: string;
  /** 是否正在保存 */
  isSaving?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 开始编辑回调 */
  onStartEdit?: () => void;
  /** 编辑内容变更回调 */
  onEditChange?: (content: string) => void;
  /** 保存编辑回调 */
  onSaveEdit?: () => void;
  /** 取消编辑回调 */
  onCancelEdit?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
}

/**
 * 类型图标映射
 */
const TYPE_ICONS: Record<MemoryType, React.ReactNode> = {
  preference: <Brain className="w-3.5 h-3.5" />,
  feedback: <MessageSquare className="w-3.5 h-3.5" />,
  style: <Palette className="w-3.5 h-3.5" />,
};

/**
 * 类型标签映射
 */
const TYPE_LABELS: Record<MemoryType, string> = {
  preference: 'Preference',
  feedback: 'Feedback',
  style: 'Style',
};

/**
 * 来源标签映射
 */
const ORIGIN_LABELS: Record<MemoryOrigin, string> = {
  manual: 'Manual',
  learned: 'Learned',
};

/**
 * 像素规范
 * 
 * 参照 Context Panel 风格：
 * | 属性 | 值 |
 * |------|-----|
 * | 内边距 | 12px |
 * | 边框 | 1px solid #222222 |
 * | 圆角 | 8px |
 */
export function MemoryItem({
  memory,
  isSelected = false,
  isEditing = false,
  editingContent = '',
  isSaving = false,
  onClick,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: MemoryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.();
    } finally {
      setIsDeleting(false);
    }
  };

  const typeIcon = TYPE_ICONS[memory.type];
  const typeLabel = TYPE_LABELS[memory.type];
  const originLabel = ORIGIN_LABELS[memory.origin];
  const formattedTime = formatMemoryTime(memory.createdAt);

  // 编辑模式
  if (isEditing) {
    return (
      <div className={clsx(
        'p-3',
        'rounded-lg',
        'border border-[var(--color-border-focus)]',
        'bg-[var(--color-bg-hover)]',
      )}>
        <Textarea
          value={editingContent}
          onChange={(e) => onEditChange?.(e.target.value)}
          placeholder="Enter memory content..."
          rows={3}
          autoFocus
          disabled={isSaving}
        />
        
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<X className="w-3 h-3" />}
            onClick={onCancelEdit}
            disabled={isSaving}
            className="h-7 px-2 text-[11px]"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check className="w-3 h-3" />}
            onClick={onSaveEdit}
            loading={isSaving}
            disabled={!editingContent.trim()}
            className="h-7 px-2 text-[11px]"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

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
      {/* 头部：类型 + 来源 + 时间 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* 类型标签 */}
          <span className={clsx(
            'flex items-center gap-1',
            'px-2 py-0.5',
            'rounded-full',
            'bg-[var(--color-bg-surface)]',
            'text-[10px] text-[var(--color-text-secondary)]',
          )}>
            {typeIcon}
            {typeLabel}
          </span>
          
          {/* 来源标签 */}
          <span className={clsx(
            'px-1.5 py-0.5',
            'rounded-full',
            memory.origin === 'learned'
              ? 'bg-[rgba(68,255,68,0.1)] text-[var(--color-success)]'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-tertiary)]',
            'text-[9px]',
          )}>
            {originLabel}
          </span>
        </div>
        
        {/* 时间 */}
        <span className="text-[10px] text-[var(--color-text-tertiary)]">
          {formattedTime}
        </span>
      </div>

      {/* 内容 */}
      <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed mb-3">
        {memory.content}
      </p>

      {/* 操作按钮 */}
      <div className={clsx(
        'flex justify-end gap-1',
        'opacity-0 group-hover:opacity-100',
        isSelected && 'opacity-100',
        'transition-opacity duration-[var(--duration-fast)]',
      )}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit?.();
          }}
          className={clsx(
            'w-7 h-7',
            'flex items-center justify-center',
            'rounded',
            'text-[var(--color-text-tertiary)]',
            'hover:text-[var(--color-text-primary)]',
            'hover:bg-[var(--color-bg-active)]',
            'transition-colors',
          )}
          aria-label="Edit memory"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className={clsx(
            'w-7 h-7',
            'flex items-center justify-center',
            'rounded',
            'text-[var(--color-text-tertiary)]',
            'hover:text-[var(--color-error)]',
            'hover:bg-[rgba(255,68,68,0.1)]',
            'transition-colors',
            isDeleting && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Delete memory"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

MemoryItem.displayName = 'MemoryItem';
