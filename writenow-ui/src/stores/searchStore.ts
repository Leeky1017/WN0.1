/**
 * Search Store
 * 
 * Zustand store 管理搜索状态。
 * 对接 search:* IPC 通道，支持全文搜索和语义搜索。
 * 
 * @see DESIGN_SPEC.md 11.1 后端现有能力总结 - search:*
 */
import { create } from 'zustand';

/**
 * 搜索结果类型
 */
export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  highlight?: string;
  projectId: string;
  projectName: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 搜索结果类型
 */
export type SearchResultType = 'document' | 'project' | 'character' | 'outline';

/**
 * 搜索模式
 */
export type SearchMode = 'fulltext' | 'semantic';

/**
 * 搜索模式信息
 */
export const SEARCH_MODES: Record<SearchMode, { label: string; description: string }> = {
  fulltext: { label: 'Full Text', description: 'Exact keyword matching' },
  semantic: { label: 'Semantic', description: 'AI-powered meaning search' },
};

/**
 * 搜索结果类型信息
 */
export const RESULT_TYPES: Record<SearchResultType, { label: string }> = {
  document: { label: 'Document' },
  project: { label: 'Project' },
  character: { label: 'Character' },
  outline: { label: 'Outline' },
};

export interface SearchState {
  // 状态
  query: string;
  mode: SearchMode;
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  
  // 筛选
  typeFilter: SearchResultType | 'all';
  projectFilter: string | null;
  
  // 历史
  recentSearches: string[];
  
  // Actions
  setQuery: (query: string) => void;
  setMode: (mode: SearchMode) => void;
  search: () => Promise<void>;
  clearResults: () => void;
  setTypeFilter: (type: SearchResultType | 'all') => void;
  setProjectFilter: (projectId: string | null) => void;
  addToRecentSearches: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Computed
  getFilteredResults: () => SearchResult[];
}

/**
 * 模拟搜索结果
 */
function generateMockResults(query: string, mode: SearchMode): SearchResult[] {
  if (!query.trim()) return [];
  
  const baseResults: SearchResult[] = [
    {
      id: 'result-1',
      type: 'document',
      title: 'Chapter 1: The Beginning',
      content: 'It was a dark and stormy night when everything changed...',
      highlight: `...when everything <mark>${query}</mark> changed...`,
      projectId: 'project-1',
      projectName: 'My Novel',
      score: 0.95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'result-2',
      type: 'document',
      title: 'Chapter 5: The Revelation',
      content: 'She finally understood what had been hidden all along...',
      highlight: `...finally understood what <mark>${query}</mark> had been...`,
      projectId: 'project-1',
      projectName: 'My Novel',
      score: 0.88,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'result-3',
      type: 'character',
      title: 'Elena Martinez',
      content: 'The protagonist, a determined journalist seeking truth.',
      highlight: `...determined journalist <mark>${query}</mark> seeking truth...`,
      projectId: 'project-1',
      projectName: 'My Novel',
      score: 0.75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'result-4',
      type: 'outline',
      title: 'Act 2 Structure',
      content: 'Rising action leading to the main conflict...',
      highlight: `...action <mark>${query}</mark> leading to...`,
      projectId: 'project-2',
      projectName: 'Short Stories',
      score: 0.65,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  // Semantic mode returns slightly different scores
  if (mode === 'semantic') {
    return baseResults.map((r) => ({
      ...r,
      score: Math.min(r.score + 0.05, 1),
    }));
  }
  
  return baseResults;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // 初始状态
  query: '',
  mode: 'fulltext',
  results: [],
  isSearching: false,
  error: null,
  typeFilter: 'all',
  projectFilter: null,
  recentSearches: [],

  setQuery: (query: string) => {
    set({ query });
  },

  setMode: (mode: SearchMode) => {
    set({ mode });
    // 切换模式后重新搜索
    const { query, search } = get();
    if (query.trim()) {
      search();
    }
  },

  /**
   * 执行搜索
   * 
   * 后续对接 search:fulltext / search:semantic IPC
   */
  search: async () => {
    const { query, mode, addToRecentSearches } = get();
    
    if (!query.trim()) {
      set({ results: [], error: null });
      return;
    }
    
    set({ isSearching: true, error: null });
    
    try {
      // TODO: 对接 search:* IPC
      // const channel = mode === 'semantic' ? 'search:semantic' : 'search:fulltext';
      // const response = await window.api.invoke(channel, { query });
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const results = generateMockResults(query, mode);
      
      set({
        results,
        isSearching: false,
      });
      
      addToRecentSearches(query);
    } catch {
      set({
        error: 'Search failed. Please try again.',
        isSearching: false,
      });
    }
  },

  clearResults: () => {
    set({ results: [], query: '', error: null });
  },

  setTypeFilter: (type: SearchResultType | 'all') => {
    set({ typeFilter: type });
  },

  setProjectFilter: (projectId: string | null) => {
    set({ projectFilter: projectId });
  },

  addToRecentSearches: (query: string) => {
    const { recentSearches } = get();
    const trimmed = query.trim();
    if (!trimmed) return;
    
    // 去重并添加到头部
    const filtered = recentSearches.filter((s) => s !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, 5);
    set({ recentSearches: updated });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },

  /**
   * 获取过滤后的搜索结果
   */
  getFilteredResults: () => {
    const { results, typeFilter, projectFilter } = get();
    
    return results.filter((result) => {
      // 类型过滤
      if (typeFilter !== 'all' && result.type !== typeFilter) {
        return false;
      }
      
      // 项目过滤
      if (projectFilter && result.projectId !== projectFilter) {
        return false;
      }
      
      return true;
    });
  },
}));
