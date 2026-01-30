/**
 * Project Store
 * 
 * Zustand store 管理项目状态。
 * 对接 project:* IPC 通道。
 * 
 * @see DESIGN_SPEC.md 11.2.3 项目状态与分类
 */
import { create } from 'zustand';

/**
 * 项目类型定义
 * 
 * 扩展自后端 Project 模型，添加前端设计需要的字段
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  styleGuide?: string;
  createdAt: string;
  updatedAt: string;
  
  // 扩展字段（前端设计需要，后端待实现）
  status: 'draft' | 'published' | 'archived';
  coverImage?: string;
  tags: string[];
  wordCount: number;
  readTime: number; // 分钟
  featured: boolean;
  collectionId?: string;
  lastOpenedAt?: string;
}

export interface ProjectState {
  // 状态
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  
  // Filters
  filter: 'all' | 'draft' | 'published' | 'archived';
  setFilter: (filter: ProjectState['filter']) => void;
  
  // 重置
  reset: () => void;
}

/**
 * Mock 项目数据
 * 
 * 用于开发和演示，后续对接 project:list IPC 后移除
 */
const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'The Art of Creative Writing',
    description: 'A comprehensive guide to mastering the craft of storytelling. Explore techniques used by bestselling authors to captivate readers from the first page to the last.',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-28T14:30:00Z',
    status: 'draft',
    coverImage: undefined,
    tags: ['writing', 'guide'],
    wordCount: 24500,
    readTime: 98,
    featured: true,
    lastOpenedAt: '2026-01-28T14:30:00Z',
  },
  {
    id: 'proj-2',
    name: 'Digital Minimalism',
    description: 'Exploring the philosophy of intentional technology use in the modern age.',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-27T16:00:00Z',
    status: 'published',
    tags: ['philosophy', 'technology'],
    wordCount: 18200,
    readTime: 73,
    featured: false,
    lastOpenedAt: '2026-01-27T16:00:00Z',
  },
  {
    id: 'proj-3',
    name: 'Short Story Collection',
    description: 'A collection of short fiction exploring themes of memory and identity.',
    createdAt: '2026-01-05T12:00:00Z',
    updatedAt: '2026-01-25T09:00:00Z',
    status: 'draft',
    tags: ['fiction', 'short-stories'],
    wordCount: 8500,
    readTime: 34,
    featured: false,
    lastOpenedAt: '2026-01-25T09:00:00Z',
  },
  {
    id: 'proj-4',
    name: 'Product Launch Blog',
    description: 'Blog posts for the upcoming product launch campaign.',
    createdAt: '2025-12-20T10:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
    status: 'archived',
    tags: ['marketing', 'blog'],
    wordCount: 5200,
    readTime: 21,
    featured: false,
    lastOpenedAt: '2026-01-20T11:00:00Z',
  },
  {
    id: 'proj-5',
    name: 'Technical Documentation',
    description: 'API documentation and developer guides for the new platform.',
    createdAt: '2026-01-20T14:00:00Z',
    updatedAt: '2026-01-29T10:00:00Z',
    status: 'draft',
    tags: ['documentation', 'technical'],
    wordCount: 12800,
    readTime: 51,
    featured: false,
    lastOpenedAt: '2026-01-29T10:00:00Z',
  },
];

const initialState = {
  projects: MOCK_PROJECTS,
  currentProject: null,
  isLoading: false,
  error: null,
  filter: 'all' as const,
};

export const useProjectStore = create<ProjectState>()((set) => ({
  ...initialState,

  /**
   * 获取项目列表
   * 
   * 后续对接 project:list IPC
   */
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('project:list')
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // 目前使用 mock 数据
      set({ projects: MOCK_PROJECTS, isLoading: false });
    } catch {
      set({ error: 'Failed to fetch projects', isLoading: false });
    }
  },

  /**
   * 创建项目
   * 
   * 后续对接 project:create IPC
   */
  createProject: async (data: Partial<Project>) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('project:create', data)
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: data.name || 'Untitled Project',
        description: data.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        tags: data.tags || [],
        wordCount: 0,
        readTime: 0,
        featured: false,
        ...data,
      };
      
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }));
      
      return newProject;
    } catch {
      set({ error: 'Failed to create project', isLoading: false });
      throw new Error('Failed to create project');
    }
  },

  /**
   * 更新项目
   * 
   * 后续对接 project:update IPC
   */
  updateProject: async (id: string, data: Partial<Project>) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('project:update', { id, ...data })
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id
            ? { ...p, ...data, updatedAt: new Date().toISOString() }
            : p
        ),
        isLoading: false,
      }));
    } catch {
      set({ error: 'Failed to update project', isLoading: false });
    }
  },

  /**
   * 删除项目
   * 
   * 后续对接 project:delete IPC
   */
  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('project:delete', { id })
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
      }));
    } catch {
      set({ error: 'Failed to delete project', isLoading: false });
    }
  },

  setCurrentProject: (project: Project | null) => set({ currentProject: project }),

  setFilter: (filter: ProjectState['filter']) => set({ filter }),

  reset: () => set(initialState),
}));

/**
 * 获取过滤后的项目列表
 */
export function useFilteredProjects(): Project[] {
  const { projects, filter } = useProjectStore();
  
  if (filter === 'all') {
    return projects;
  }
  
  return projects.filter((p) => p.status === filter);
}

/**
 * 获取特色项目
 */
export function useFeaturedProject(): Project | undefined {
  const { projects } = useProjectStore();
  return projects.find((p) => p.featured);
}
