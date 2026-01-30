/**
 * VersionHistoryPanel Component
 * 
 * 版本历史面板，显示文档的版本列表。
 * 
 * @see DESIGN_SPEC.md 8.1.5 版本历史流程
 * @see DESIGN_SPEC.md 4.5 Panel 规范
 */
import { useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { X, Plus, Clock } from 'lucide-react';
import { Button } from '../../components/primitives/Button';
import { LoadingState } from '../../components/patterns/LoadingState';
import { EmptyState } from '../../components/patterns/EmptyState';
import { VersionItem } from './components/VersionItem';
import {
  useVersionStore,
  type VersionItem as VersionItemType,
} from '../../stores/versionStore';

export interface VersionHistoryPanelProps {
  /** 当前文章 ID */
  articleId: string;
  /** 折叠回调 */
  onCollapse?: () => void;
  /** 恢复版本回调（恢复成功后调用，传入恢复的内容） */
  onRestore?: (content: string) => void;
}

/**
 * 像素规范
 * 
 * 参照 Panel 规范：
 * | 属性 | 值 |
 * |------|-----|
 * | 默认宽度 | 280px |
 * | 背景 | #080808 |
 * | 左边框 | 1px solid #222222 |
 * | 内边距 | 16px |
 */
export function VersionHistoryPanel({
  articleId,
  onCollapse,
  onRestore,
}: VersionHistoryPanelProps) {
  const {
    versions,
    selectedVersionId,
    isLoading,
    isRestoring,
    error,
    fetchVersions,
    createVersion,
    restoreVersion,
    selectVersion,
  } = useVersionStore();

  // 加载版本列表
  useEffect(() => {
    fetchVersions(articleId);
  }, [articleId, fetchVersions]);

  /**
   * 处理创建版本
   */
  const handleCreateVersion = useCallback(async () => {
    try {
      await createVersion(articleId, undefined, 'Manual save');
    } catch {
      // Error handled in store
    }
  }, [articleId, createVersion]);

  /**
   * 处理版本选择
   */
  const handleVersionClick = useCallback((version: VersionItemType) => {
    selectVersion(version.id);
  }, [selectVersion]);

  /**
   * 处理版本恢复
   */
  const handleRestore = useCallback(async (version: VersionItemType) => {
    try {
      const content = await restoreVersion(version.id);
      onRestore?.(content);
    } catch {
      // Error handled in store
    }
  }, [restoreVersion, onRestore]);

  return (
    <div
      className={clsx(
        'h-full flex flex-col',
        'bg-[var(--color-bg-body)]',
        'border-l border-[var(--color-border-default)]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Version History
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="w-3 h-3" />}
            onClick={handleCreateVersion}
            className="h-7 px-2 text-[11px]"
          >
            Save
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* 加载状态 */}
        {isLoading && versions.length === 0 && (
          <div className="py-8">
            <LoadingState text="Loading versions..." />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="py-8 text-center text-[13px] text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && versions.length === 0 && (
          <EmptyState
            icon={<Clock className="w-12 h-12" />}
            title="No versions yet"
            description="Versions are created automatically when you save or when AI makes edits."
            action={{
              label: 'Create Version',
              onClick: handleCreateVersion,
              variant: 'secondary',
            }}
          />
        )}

        {/* 版本列表 */}
        {versions.length > 0 && (
          <div className="space-y-2">
            {versions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                isSelected={selectedVersionId === version.id}
                isRestoring={isRestoring && selectedVersionId === version.id}
                onClick={handleVersionClick}
                onRestore={handleRestore}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

VersionHistoryPanel.displayName = 'VersionHistoryPanel';
