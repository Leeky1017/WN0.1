/**
 * Version Store
 * 
 * Zustand store 管理版本历史状态。
 * 对接 version:* IPC 通道 (list/create/restore/diff)。
 * 
 * @see DESIGN_SPEC.md 8.1.5 版本历史流程
 */
import { create } from 'zustand';

/**
 * 版本创建者类型
 */
export type VersionActor = 'user' | 'ai' | 'auto';

/**
 * 版本项
 */
export interface VersionItem {
  /** 快照 ID */
  id: string;
  /** 文章 ID */
  articleId: string;
  /** 版本名称（可选） */
  name?: string;
  /** 创建原因（可选） */
  reason?: string;
  /** 创建者 */
  actor: VersionActor;
  /** 创建时间 */
  createdAt: string;
  /** 内容预览（可选，用于快速查看） */
  contentPreview?: string;
}

/**
 * 版本差异
 */
export interface VersionDiff {
  /** 差异格式 */
  format: 'unified';
  /** 差异内容 */
  diff: string;
}

export interface VersionState {
  // 状态
  versions: VersionItem[];
  currentArticleId: string | null;
  selectedVersionId: string | null;
  compareVersionId: string | null;
  diff: VersionDiff | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  
  // 分页
  hasMore: boolean;
  cursor: string | null;
  
  // Actions
  fetchVersions: (articleId: string) => Promise<void>;
  fetchMoreVersions: () => Promise<void>;
  createVersion: (articleId: string, name?: string, reason?: string) => Promise<VersionItem>;
  restoreVersion: (snapshotId: string) => Promise<string>;
  fetchDiff: (fromSnapshotId: string, toSnapshotId: string) => Promise<void>;
  
  // 选择
  selectVersion: (id: string | null) => void;
  setCompareVersion: (id: string | null) => void;
  
  // 重置
  reset: () => void;
}

/**
 * Mock 版本历史数据
 */
const MOCK_VERSIONS: VersionItem[] = [
  {
    id: 'ver-1',
    articleId: 'article-1',
    name: 'Current version',
    reason: 'Auto-saved',
    actor: 'auto',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5分钟前
    contentPreview: 'The Art of Creative Writing...',
  },
  {
    id: 'ver-2',
    articleId: 'article-1',
    name: 'Added conclusion',
    reason: 'Manual save before AI edit',
    actor: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
    contentPreview: 'Every writer begins their journey...',
  },
  {
    id: 'ver-3',
    articleId: 'article-1',
    reason: 'AI revision applied',
    actor: 'ai',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
    contentPreview: 'Chapter 1: The Beginning...',
  },
  {
    id: 'ver-4',
    articleId: 'article-1',
    reason: 'Auto-saved',
    actor: 'auto',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1天前
    contentPreview: 'Draft content...',
  },
  {
    id: 'ver-5',
    articleId: 'article-1',
    name: 'Initial draft',
    reason: 'Created document',
    actor: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3天前
    contentPreview: 'Untitled document...',
  },
];

const initialState = {
  versions: [],
  currentArticleId: null,
  selectedVersionId: null,
  compareVersionId: null,
  diff: null,
  isLoading: false,
  isRestoring: false,
  error: null,
  hasMore: false,
  cursor: null,
};

export const useVersionStore = create<VersionState>()((set, get) => ({
  ...initialState,

  /**
   * 获取版本列表
   * 
   * 后续对接 window.api.invoke('version:list', { articleId })
   */
  fetchVersions: async (articleId: string) => {
    set({ isLoading: true, error: null, currentArticleId: articleId });
    
    try {
      // TODO: 对接 window.api.invoke('version:list', { articleId })
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // 目前使用 mock 数据
      set({
        versions: MOCK_VERSIONS.filter((v) => v.articleId === articleId || articleId === 'article-1'),
        isLoading: false,
        hasMore: false,
        cursor: null,
      });
    } catch {
      set({ error: 'Failed to fetch versions', isLoading: false });
    }
  },

  /**
   * 加载更多版本
   */
  fetchMoreVersions: async () => {
    const { currentArticleId, cursor, hasMore } = get();
    
    if (!currentArticleId || !hasMore) return;
    
    set({ isLoading: true });
    
    try {
      // TODO: 对接 window.api.invoke('version:list', { articleId, cursor })
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // Mock: 没有更多数据
      set({ isLoading: false, hasMore: false });
    } catch {
      set({ error: 'Failed to load more versions', isLoading: false });
    }
  },

  /**
   * 创建版本
   * 
   * 后续对接 window.api.invoke('version:create', { articleId, name, reason })
   */
  createVersion: async (articleId: string, name?: string, reason?: string) => {
    try {
      // TODO: 对接 window.api.invoke('version:create', { articleId, name, reason })
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const newVersion: VersionItem = {
        id: `ver-${Date.now()}`,
        articleId,
        name,
        reason: reason || 'Manual save',
        actor: 'user',
        createdAt: new Date().toISOString(),
      };
      
      set((state) => ({
        versions: [newVersion, ...state.versions],
      }));
      
      return newVersion;
    } catch {
      set({ error: 'Failed to create version' });
      throw new Error('Failed to create version');
    }
  },

  /**
   * 恢复版本
   * 
   * 后续对接 window.api.invoke('version:restore', { snapshotId })
   */
  restoreVersion: async (snapshotId: string) => {
    set({ isRestoring: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('version:restore', { snapshotId })
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Mock: 返回恢复的内容
      const version = get().versions.find((v) => v.id === snapshotId);
      const content = version?.contentPreview || 'Restored content';
      
      set({ isRestoring: false });
      
      return content;
    } catch {
      set({ error: 'Failed to restore version', isRestoring: false });
      throw new Error('Failed to restore version');
    }
  },

  /**
   * 获取版本差异
   * 
   * 后续对接 window.api.invoke('version:diff', { fromSnapshotId, toSnapshotId })
   */
  fetchDiff: async (fromSnapshotId: string, toSnapshotId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('version:diff', { fromSnapshotId, toSnapshotId })
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      // Mock diff
      const diff: VersionDiff = {
        format: 'unified',
        diff: `--- ${fromSnapshotId}
+++ ${toSnapshotId}
@@ -1,5 +1,5 @@
 The Art of Creative Writing
 
-Every writer begins their journey with a blank page.
+Every writer starts their journey with a blank page.
 
 It's both terrifying and exhilarating.`,
      };
      
      set({ diff, isLoading: false });
    } catch {
      set({ error: 'Failed to fetch diff', isLoading: false });
    }
  },

  /**
   * 选择版本
   */
  selectVersion: (id: string | null) => set({ selectedVersionId: id }),

  /**
   * 设置比较版本
   */
  setCompareVersion: (id: string | null) => set({ compareVersionId: id }),

  /**
   * 重置
   */
  reset: () => set(initialState),
}));

/**
 * 获取选中的版本
 */
export function useSelectedVersion(): VersionItem | null {
  const { versions, selectedVersionId } = useVersionStore();
  
  if (!selectedVersionId) return null;
  
  return versions.find((v) => v.id === selectedVersionId) || null;
}

/**
 * 格式化版本时间
 */
export function formatVersionTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
