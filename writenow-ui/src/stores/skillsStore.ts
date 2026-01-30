/**
 * Skills Store
 * 
 * Zustand store 管理技能状态。
 * 对接 skill:* IPC 通道。
 * 
 * @see DESIGN_SPEC.md 11.1 后端现有能力总结 - skill:*
 */
import { create } from 'zustand';

/**
 * 技能类型定义
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  enabled: boolean;
  icon?: string;
  author?: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 技能分类
 */
export type SkillCategory = 
  | 'writing'     // 写作辅助
  | 'research'    // 研究工具
  | 'editing'     // 编辑工具
  | 'formatting'  // 格式化
  | 'custom';     // 自定义

/**
 * 技能分类信息
 */
export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; description: string }> = {
  writing: { label: 'Writing', description: 'Writing assistance skills' },
  research: { label: 'Research', description: 'Research and fact-checking skills' },
  editing: { label: 'Editing', description: 'Editing and proofreading skills' },
  formatting: { label: 'Formatting', description: 'Document formatting skills' },
  custom: { label: 'Custom', description: 'User-created skills' },
};

export interface SkillsState {
  // 状态
  skills: Skill[];
  selectedSkillId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 筛选
  searchQuery: string;
  categoryFilter: SkillCategory | 'all';
  
  // Actions
  fetchSkills: () => Promise<void>;
  toggleSkill: (skillId: string, enabled: boolean) => Promise<void>;
  selectSkill: (skillId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: SkillCategory | 'all') => void;
  
  // Computed
  getFilteredSkills: () => Skill[];
}

/**
 * 模拟技能数据
 */
const MOCK_SKILLS: Skill[] = [
  {
    id: 'expand-text',
    name: 'Expand Text',
    description: 'Expand selected text with more detail and context',
    category: 'writing',
    enabled: true,
    author: 'WriteNow',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'condense-text',
    name: 'Condense Text',
    description: 'Shorten and simplify selected text while preserving meaning',
    category: 'editing',
    enabled: true,
    author: 'WriteNow',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'improve-flow',
    name: 'Improve Flow',
    description: 'Enhance the flow and readability of your writing',
    category: 'editing',
    enabled: false,
    author: 'WriteNow',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'fact-check',
    name: 'Fact Check',
    description: 'Verify facts and claims in your document',
    category: 'research',
    enabled: true,
    author: 'WriteNow',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'generate-outline',
    name: 'Generate Outline',
    description: 'Create a structured outline from your content',
    category: 'writing',
    enabled: false,
    author: 'WriteNow',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'format-markdown',
    name: 'Format as Markdown',
    description: 'Convert content to proper Markdown formatting',
    category: 'formatting',
    enabled: true,
    author: 'WriteNow',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useSkillsStore = create<SkillsState>((set, get) => ({
  // 初始状态
  skills: [],
  selectedSkillId: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  categoryFilter: 'all',

  /**
   * 获取技能列表
   * 
   * 后续对接 skill:list IPC
   */
  fetchSkills: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 skill:list IPC
      // const response = await window.api.invoke('skill:list');
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set({
        skills: MOCK_SKILLS,
        isLoading: false,
      });
    } catch {
      set({
        error: 'Failed to load skills',
        isLoading: false,
      });
    }
  },

  /**
   * 切换技能开关
   * 
   * 后续对接 skill:toggle IPC
   */
  toggleSkill: async (skillId: string, enabled: boolean) => {
    const { skills } = get();
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    // 乐观更新
    set({
      skills: skills.map((s) =>
        s.id === skillId ? { ...s, enabled } : s
      ),
    });

    try {
      // TODO: 对接 skill:toggle IPC
      // await window.api.invoke('skill:toggle', { skillId, enabled });
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // 回滚
      set({
        skills: skills.map((s) =>
          s.id === skillId ? { ...s, enabled: skill.enabled } : s
        ),
        error: 'Failed to toggle skill',
      });
    }
  },

  selectSkill: (skillId: string | null) => {
    set({ selectedSkillId: skillId });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCategoryFilter: (category: SkillCategory | 'all') => {
    set({ categoryFilter: category });
  },

  /**
   * 获取过滤后的技能列表
   */
  getFilteredSkills: () => {
    const { skills, searchQuery, categoryFilter } = get();
    
    return skills.filter((skill) => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = skill.name.toLowerCase().includes(query);
        const matchesDesc = skill.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }
      
      // 分类过滤
      if (categoryFilter !== 'all' && skill.category !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  },
}));
