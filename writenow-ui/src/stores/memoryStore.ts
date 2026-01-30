/**
 * Memory Store
 * 
 * Zustand store 管理用户记忆状态。
 * 对接 memory:* IPC 通道。
 * 
 * @see DESIGN_SPEC.md 11.1 后端现有能力总结 - memory:*
 */
import { create } from 'zustand';

/**
 * 记忆类型定义
 */
export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  projectId: string | null;
  origin: MemoryOrigin;
  createdAt: string;
  updatedAt: string;
}

/**
 * 记忆类型
 */
export type MemoryType = 'preference' | 'feedback' | 'style';

/**
 * 记忆来源
 */
export type MemoryOrigin = 'manual' | 'learned';

/**
 * 记忆类型信息
 */
export const MEMORY_TYPES: Record<MemoryType, { label: string; description: string }> = {
  preference: { label: 'Preference', description: 'Writing preferences and styles' },
  feedback: { label: 'Feedback', description: 'Feedback and corrections' },
  style: { label: 'Style', description: 'Writing style rules' },
};

export interface MemoryState {
  // 状态
  memories: Memory[];
  selectedMemoryId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // 筛选
  searchQuery: string;
  typeFilter: MemoryType | 'all';
  
  // 编辑状态
  editingMemoryId: string | null;
  editingContent: string;
  
  // Actions
  fetchMemories: (projectId?: string) => Promise<void>;
  createMemory: (type: MemoryType, content: string, projectId?: string) => Promise<void>;
  updateMemory: (memoryId: string, content: string) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
  selectMemory: (memoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: MemoryType | 'all') => void;
  
  // 编辑
  startEditing: (memoryId: string) => void;
  setEditingContent: (content: string) => void;
  cancelEditing: () => void;
  saveEditing: () => Promise<void>;
  
  // Computed
  getFilteredMemories: () => Memory[];
}

/**
 * 模拟记忆数据
 */
const MOCK_MEMORIES: Memory[] = [
  {
    id: 'mem-1',
    type: 'preference',
    content: 'I prefer concise, clear writing without unnecessary adverbs.',
    projectId: null,
    origin: 'manual',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'mem-2',
    type: 'style',
    content: 'Use active voice instead of passive voice whenever possible.',
    projectId: null,
    origin: 'learned',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'mem-3',
    type: 'feedback',
    content: 'Avoid using "very" and "really" as intensifiers.',
    projectId: null,
    origin: 'learned',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mem-4',
    type: 'preference',
    content: 'British English spelling (colour, favour, organise).',
    projectId: 'project-1',
    origin: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useMemoryStore = create<MemoryState>((set, get) => ({
  // 初始状态
  memories: [],
  selectedMemoryId: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: '',
  typeFilter: 'all',
  editingMemoryId: null,
  editingContent: '',

  /**
   * 获取记忆列表
   * 
   * 后续对接 memory:list IPC
   */
  fetchMemories: async (_projectId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 memory:list IPC
      // const response = await window.api.invoke('memory:list', { projectId });
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set({
        memories: MOCK_MEMORIES,
        isLoading: false,
      });
    } catch {
      set({
        error: 'Failed to load memories',
        isLoading: false,
      });
    }
  },

  /**
   * 创建记忆
   * 
   * 后续对接 memory:create IPC
   */
  createMemory: async (type: MemoryType, content: string, projectId?: string) => {
    set({ isSaving: true, error: null });
    
    try {
      // TODO: 对接 memory:create IPC
      // await window.api.invoke('memory:create', { type, content, projectId });
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const newMemory: Memory = {
        id: `mem-${Date.now()}`,
        type,
        content,
        projectId: projectId || null,
        origin: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      set((state) => ({
        memories: [newMemory, ...state.memories],
        isSaving: false,
      }));
    } catch {
      set({
        error: 'Failed to create memory',
        isSaving: false,
      });
    }
  },

  /**
   * 更新记忆
   * 
   * 后续对接 memory:update IPC
   */
  updateMemory: async (memoryId: string, content: string) => {
    set({ isSaving: true, error: null });
    
    try {
      // TODO: 对接 memory:update IPC
      // await window.api.invoke('memory:update', { id: memoryId, content });
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      set((state) => ({
        memories: state.memories.map((m) =>
          m.id === memoryId
            ? { ...m, content, updatedAt: new Date().toISOString() }
            : m
        ),
        isSaving: false,
        editingMemoryId: null,
        editingContent: '',
      }));
    } catch {
      set({
        error: 'Failed to update memory',
        isSaving: false,
      });
    }
  },

  /**
   * 删除记忆
   * 
   * 后续对接 memory:delete IPC
   */
  deleteMemory: async (memoryId: string) => {
    const { memories } = get();
    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) return;
    
    // 乐观删除
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== memoryId),
      selectedMemoryId: state.selectedMemoryId === memoryId ? null : state.selectedMemoryId,
    }));
    
    try {
      // TODO: 对接 memory:delete IPC
      // await window.api.invoke('memory:delete', { id: memoryId });
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // 回滚
      set((state) => ({
        memories: [...state.memories, memory],
        error: 'Failed to delete memory',
      }));
    }
  },

  selectMemory: (memoryId: string | null) => {
    set({ selectedMemoryId: memoryId });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setTypeFilter: (type: MemoryType | 'all') => {
    set({ typeFilter: type });
  },

  startEditing: (memoryId: string) => {
    const { memories } = get();
    const memory = memories.find((m) => m.id === memoryId);
    if (memory) {
      set({
        editingMemoryId: memoryId,
        editingContent: memory.content,
      });
    }
  },

  setEditingContent: (content: string) => {
    set({ editingContent: content });
  },

  cancelEditing: () => {
    set({
      editingMemoryId: null,
      editingContent: '',
    });
  },

  saveEditing: async () => {
    const { editingMemoryId, editingContent, updateMemory } = get();
    if (editingMemoryId && editingContent.trim()) {
      await updateMemory(editingMemoryId, editingContent.trim());
    }
  },

  /**
   * 获取过滤后的记忆列表
   */
  getFilteredMemories: () => {
    const { memories, searchQuery, typeFilter } = get();
    
    return memories.filter((memory) => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!memory.content.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // 类型过滤
      if (typeFilter !== 'all' && memory.type !== typeFilter) {
        return false;
      }
      
      return true;
    });
  },
}));

/**
 * 格式化记忆时间
 */
export function formatMemoryTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
