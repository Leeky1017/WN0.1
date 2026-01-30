/**
 * MemoryPanel Component
 * 
 * 记忆面板，显示和管理用户记忆/偏好/反馈。
 * 按 Context Panel 风格推导实现。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Memory Panel 参照 Context Panel
 */
import { useEffect, useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { X, Brain, Plus, Search } from 'lucide-react';
import { Input } from '../../components/primitives/Input';
import { Select } from '../../components/primitives/Select';
import { Button } from '../../components/primitives/Button';
import { Textarea } from '../../components/primitives/Textarea';
import { LoadingState } from '../../components/patterns/LoadingState';
import { EmptyState } from '../../components/patterns/EmptyState';
import { MemoryItem } from './components/MemoryItem';
import { 
  useMemoryStore, 
  MEMORY_TYPES,
  type MemoryType,
} from '../../stores/memoryStore';

export interface MemoryPanelProps {
  /** 当前项目 ID（可选，用于显示项目特定记忆） */
  projectId?: string;
  /** 折叠回调 */
  onCollapse?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 类型选项
 */
const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...Object.entries(MEMORY_TYPES).map(([value, { label }]) => ({
    value,
    label,
  })),
];

/**
 * 新建记忆的类型选项
 */
const NEW_TYPE_OPTIONS = Object.entries(MEMORY_TYPES).map(([value, { label }]) => ({
  value,
  label,
}));

/**
 * 像素规范
 * 
 * 参照 Context Panel 规范：
 * | 属性 | 值 |
 * |------|-----|
 * | 默认宽度 | 280px |
 * | 背景 | #080808 |
 * | 左边框 | 1px solid #222222 |
 */
export function MemoryPanel({
  projectId,
  onCollapse,
  className,
}: MemoryPanelProps) {
  const {
    isLoading,
    isSaving,
    error,
    searchQuery,
    typeFilter,
    selectedMemoryId,
    editingMemoryId,
    editingContent,
    fetchMemories,
    createMemory,
    deleteMemory,
    selectMemory,
    setSearchQuery,
    setTypeFilter,
    startEditing,
    setEditingContent,
    cancelEditing,
    saveEditing,
    getFilteredMemories,
  } = useMemoryStore();

  // 新建表单状态
  const [isCreating, setIsCreating] = useState(false);
  const [newType, setNewType] = useState<MemoryType>('preference');
  const [newContent, setNewContent] = useState('');

  // 加载记忆列表
  useEffect(() => {
    fetchMemories(projectId);
  }, [projectId, fetchMemories]);

  const filteredMemories = getFilteredMemories();

  /**
   * 处理搜索
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  /**
   * 处理类型筛选
   */
  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value as MemoryType | 'all');
  }, [setTypeFilter]);

  /**
   * 处理记忆点击
   */
  const handleMemoryClick = useCallback((memoryId: string) => {
    selectMemory(selectedMemoryId === memoryId ? null : memoryId);
  }, [selectedMemoryId, selectMemory]);

  /**
   * 处理创建记忆
   */
  const handleCreate = useCallback(async () => {
    if (!newContent.trim()) return;
    
    await createMemory(newType, newContent.trim(), projectId);
    setNewContent('');
    setIsCreating(false);
  }, [newType, newContent, projectId, createMemory]);

  /**
   * 取消创建
   */
  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewContent('');
    setNewType('preference');
  }, []);

  return (
    <div
      className={clsx(
        'h-full flex flex-col',
        'bg-[var(--color-bg-body)]',
        'border-l border-[var(--color-border-default)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Memory
          </h2>
          {/* 记忆数量 */}
          <span className={clsx(
            'px-1.5 py-0.5',
            'rounded-full',
            'bg-[var(--color-bg-hover)]',
            'text-[10px] text-[var(--color-text-secondary)]',
          )}>
            {filteredMemories.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="w-3 h-3" />}
            onClick={() => setIsCreating(true)}
            className="h-7 px-2 text-[11px]"
          >
            Add
          </Button>
          
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
      </div>

      {/* 搜索和筛选 */}
      <div className="p-4 space-y-3 shrink-0 border-b border-[var(--color-border-default)]">
        {/* 搜索框 */}
        <Input
          type="search"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={handleSearchChange}
          leftSlot={<Search className="w-4 h-4" />}
          className="h-9"
        />
        
        {/* 类型选择 */}
        <Select
          value={typeFilter}
          options={TYPE_OPTIONS}
          onChange={handleTypeChange}
          placeholder="Filter by type"
        />
      </div>

      {/* 新建表单 */}
      {isCreating && (
        <div className="p-4 border-b border-[var(--color-border-default)] shrink-0">
          <div className="space-y-3">
            <Select
              value={newType}
              options={NEW_TYPE_OPTIONS}
              onChange={(value) => setNewType(value as MemoryType)}
              placeholder="Select type"
            />
            
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter memory content..."
              rows={3}
              autoFocus
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelCreate}
                className="h-7 px-2 text-[11px]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                loading={isSaving}
                disabled={!newContent.trim()}
                className="h-7 px-2 text-[11px]"
              >
                Add Memory
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 记忆列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 加载状态 */}
        {isLoading && (
          <div className="py-8">
            <LoadingState text="Loading memories..." />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="py-8 text-center text-[13px] text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && filteredMemories.length === 0 && (
          <EmptyState
            icon={<Brain className="w-12 h-12" />}
            title={searchQuery ? 'No memories found' : 'No memories yet'}
            description={
              searchQuery
                ? 'Try adjusting your search or filter'
                : 'Memories help AI understand your preferences'
            }
            action={
              !searchQuery
                ? {
                    label: 'Add Memory',
                    onClick: () => setIsCreating(true),
                    variant: 'secondary',
                  }
                : undefined
            }
          />
        )}

        {/* 记忆列表 */}
        {!isLoading && !error && filteredMemories.length > 0 && (
          <div className="space-y-2">
            {filteredMemories.map((memory) => (
              <MemoryItem
                key={memory.id}
                memory={memory}
                isSelected={selectedMemoryId === memory.id}
                isEditing={editingMemoryId === memory.id}
                editingContent={editingMemoryId === memory.id ? editingContent : undefined}
                isSaving={isSaving && editingMemoryId === memory.id}
                onClick={() => handleMemoryClick(memory.id)}
                onStartEdit={() => startEditing(memory.id)}
                onEditChange={setEditingContent}
                onSaveEdit={saveEditing}
                onCancelEdit={cancelEditing}
                onDelete={() => deleteMemory(memory.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer 提示 */}
      <div className="p-4 shrink-0 border-t border-[var(--color-border-default)]">
        <p className="text-[11px] text-[var(--color-text-tertiary)] text-center">
          AI uses memories to personalize responses
        </p>
      </div>
    </div>
  );
}

MemoryPanel.displayName = 'MemoryPanel';
