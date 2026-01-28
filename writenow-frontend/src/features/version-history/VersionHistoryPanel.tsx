/**
 * VersionHistoryPanel
 * Why: Display version history with list, diff, and restore capabilities.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Clock, User, Bot, Cog, AlertCircle, RefreshCw, FileText, ArrowLeft, RotateCcw, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWriteModeStore } from '@/features/write-mode/writeModeStore';
import type { VersionListItem } from '@/types/ipc-generated';

import { useVersionHistory } from './useVersionHistory';

/**
 * Format relative time from ISO date string
 */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days === 1 ? '昨天' : `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return '刚刚';
}

/**
 * Get actor icon
 */
function getActorIcon(actor: VersionListItem['actor']) {
  switch (actor) {
    case 'user':
      return <User size={10} />;
    case 'ai':
      return <Bot size={10} />;
    case 'auto':
      return <Cog size={10} />;
    default:
      return <Clock size={10} />;
  }
}

/**
 * Get actor label
 */
function getActorLabel(actor: VersionListItem['actor']): string {
  switch (actor) {
    case 'user':
      return '手动';
    case 'ai':
      return 'AI';
    case 'auto':
      return '自动';
    default:
      return '未知';
  }
}

type ViewMode = 'list' | 'diff' | 'compare-select';

/**
 * VersionHistoryPanel component for the sidebar.
 */
export function VersionHistoryPanel() {
  const activeFilePath = useWriteModeStore((s) => s.activeFilePath);
  const updateMarkdown = useWriteModeStore((s) => s.updateMarkdown);
  const contentVersion = useWriteModeStore((s) => s.contentVersion);

  const {
    versions,
    loading,
    error,
    diffResult,
    loadVersions,
    restoreVersion,
    getDiff,
    clearDiff,
  } = useVersionHistory();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);

  // Load versions when file changes
  useEffect(() => {
    if (!activeFilePath) return;
    void loadVersions(activeFilePath);
    setViewMode('list');
    setSelectedVersions([]);
    clearDiff();
  }, [activeFilePath, loadVersions, clearDiff]);

  // Re-load versions after content changes (new version might have been created)
  useEffect(() => {
    if (!activeFilePath) return;
    // Debounce to avoid too frequent reloads
    const timer = setTimeout(() => {
      void loadVersions(activeFilePath);
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeFilePath, contentVersion, loadVersions]);

  const handleRestore = useCallback(async (version: VersionListItem) => {
    setRestoring(true);
    try {
      const result = await restoreVersion(version.id);
      updateMarkdown(result.content);
    } catch {
      // Error is already handled in the hook
    } finally {
      setRestoring(false);
    }
  }, [restoreVersion, updateMarkdown]);

  const handleCompare = useCallback(() => {
    setViewMode('compare-select');
    setSelectedVersions([]);
  }, []);

  const handleSelectVersion = useCallback((versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  }, []);

  const handleViewDiff = useCallback(async () => {
    if (selectedVersions.length !== 2) return;
    const [from, to] = selectedVersions;
    await getDiff(from, to);
    setViewMode('diff');
  }, [selectedVersions, getDiff]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedVersions([]);
    clearDiff();
  }, [clearDiff]);

  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [versions]);

  // No file open
  if (!activeFilePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <FileText size={24} className="text-[var(--fg-subtle)] mb-2" />
        <div className="text-[11px] text-[var(--fg-muted)] text-center">
          打开文档后显示版本历史
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && versions.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <RefreshCw size={16} className="animate-spin text-[var(--fg-muted)]" />
        <span className="ml-2 text-[11px] text-[var(--fg-muted)]">加载中...</span>
      </div>
    );
  }

  // Error state
  if (error && versions.length === 0) {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-[var(--error)]">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadVersions(activeFilePath)} className="w-full">
          重试
        </Button>
      </div>
    );
  }

  // Diff view
  if (viewMode === 'diff' && diffResult !== null) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-[var(--border-subtle)]">
          <Button variant="ghost" size="sm" onClick={handleBackToList} leftIcon={<ArrowLeft size={14} />}>
            返回列表
          </Button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-2">
          <div className="text-[10px] text-[var(--fg-subtle)] mb-2">
            版本差异（统一格式）
          </div>
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-[var(--bg-input)] p-2 rounded-md border border-[var(--border-subtle)]">
            {diffResult || '两个版本内容相同'}
          </pre>
        </div>
      </div>
    );
  }

  // Compare select mode
  if (viewMode === 'compare-select') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBackToList} leftIcon={<ArrowLeft size={14} />}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleViewDiff()}
              disabled={selectedVersions.length !== 2}
            >
              比较
            </Button>
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">
            选择两个版本进行比较 ({selectedVersions.length}/2)
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2">
          <div className="space-y-1">
            {sortedVersions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                selectable
                selected={selectedVersions.includes(version.id)}
                onSelect={() => handleSelectVersion(version.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view (default)
  return (
    <div className="h-full flex flex-col">
      {/* Actions */}
      <div className="p-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCompare}
          leftIcon={<GitCompare size={14} />}
          disabled={versions.length < 2}
        >
          比较版本
        </Button>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sortedVersions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <History size={24} className="text-[var(--fg-subtle)] mb-2" />
            <div className="text-[11px] text-[var(--fg-muted)] text-center">
              暂无版本历史
            </div>
            <div className="text-[10px] text-[var(--fg-subtle)] text-center mt-1">
              保存文档后将自动创建版本
            </div>
          </div>
        ) : (
          <div className="py-2 px-2 space-y-1">
            {sortedVersions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                onRestore={() => void handleRestore(version)}
                restoring={restoring}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="p-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--error)]">
          {error}
        </div>
      )}
    </div>
  );
}

interface VersionItemProps {
  version: VersionListItem;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onRestore?: () => void;
  restoring?: boolean;
}

function VersionItem({ version, selectable, selected, onSelect, onRestore, restoring }: VersionItemProps) {
  const displayName = version.name || version.reason || formatRelativeTime(version.createdAt);
  
  if (selectable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left p-2 rounded-lg transition-colors',
          selected
            ? 'bg-[var(--accent-default)]/10 border border-[var(--accent-default)]'
            : 'hover:bg-[var(--bg-hover)] border border-transparent'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center',
                selected
                  ? 'bg-[var(--accent-default)] border-[var(--accent-default)]'
                  : 'border-[var(--border-default)]'
              )}
            >
              {selected && <span className="text-[var(--fg-on-accent)] text-[10px]">✓</span>}
            </div>
            <span className="text-[11px] font-medium text-[var(--fg-default)]">{displayName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-6">
          <span className="flex items-center gap-1 text-[9px] text-[var(--fg-subtle)]">
            {getActorIcon(version.actor)}
            {getActorLabel(version.actor)}
          </span>
          <span className="text-[9px] text-[var(--fg-subtle)]">
            {formatRelativeTime(version.createdAt)}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-[var(--fg-default)] truncate">
            {displayName}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[9px] text-[var(--fg-subtle)]">
              {getActorIcon(version.actor)}
              {getActorLabel(version.actor)}
            </span>
            <span className="text-[9px] text-[var(--fg-subtle)]">
              {formatRelativeTime(version.createdAt)}
            </span>
          </div>
        </div>
        {onRestore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            loading={restoring}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="恢复此版本"
          >
            <RotateCcw size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}
