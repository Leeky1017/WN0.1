/**
 * Command Store
 * 
 * Zustand store 管理命令面板状态。
 * 提供命令注册机制和快捷键绑定。
 * 
 * @see DESIGN_SPEC.md 8.1.4 搜索流程
 * @see DESIGN_SPEC.md 8.3.1 全局快捷键
 */
import { create } from 'zustand';

/**
 * 命令类型
 */
export type CommandCategory = 'navigation' | 'editor' | 'ai' | 'file' | 'settings' | 'project';

/**
 * 命令项定义
 */
export interface Command {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  label: string;
  /** 描述（可选） */
  description?: string;
  /** 分类 */
  category: CommandCategory;
  /** 快捷键（可选，如 "Cmd+K" 或 "Ctrl+Shift+P"） */
  shortcut?: string;
  /** 图标（可选，Lucide 图标名称） */
  icon?: string;
  /** 执行回调 */
  action: () => void | Promise<void>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 搜索关键词（用于模糊匹配） */
  keywords?: string[];
}

/**
 * 命令分类显示名称
 */
export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: 'Navigation',
  editor: 'Editor',
  ai: 'AI',
  file: 'File',
  settings: 'Settings',
  project: 'Project',
};

export interface CommandState {
  // 状态
  commands: Map<string, Command>;
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  recentCommandIds: string[];
  
  // Actions
  registerCommand: (command: Command) => void;
  registerCommands: (commands: Command[]) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => Promise<void>;
  
  // 面板控制
  open: () => void;
  close: () => void;
  toggle: () => void;
  
  // 搜索
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // 导航
  selectNext: () => void;
  selectPrevious: () => void;
  setSelectedIndex: (index: number) => void;
  
  // 最近使用
  addToRecent: (id: string) => void;
  clearRecent: () => void;
  
  // 重置
  reset: () => void;
}

const MAX_RECENT_COMMANDS = 5;

const initialState = {
  commands: new Map<string, Command>(),
  isOpen: false,
  searchQuery: '',
  selectedIndex: 0,
  recentCommandIds: [],
};

export const useCommandStore = create<CommandState>()((set, get) => ({
  ...initialState,

  /**
   * 注册单个命令
   */
  registerCommand: (command: Command) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      newCommands.set(command.id, command);
      return { commands: newCommands };
    });
  },

  /**
   * 批量注册命令
   */
  registerCommands: (commands: Command[]) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      for (const command of commands) {
        newCommands.set(command.id, command);
      }
      return { commands: newCommands };
    });
  },

  /**
   * 注销命令
   */
  unregisterCommand: (id: string) => {
    set((state) => {
      const newCommands = new Map(state.commands);
      newCommands.delete(id);
      return { commands: newCommands };
    });
  },

  /**
   * 执行命令
   */
  executeCommand: async (id: string) => {
    const { commands, addToRecent, close } = get();
    const command = commands.get(id);
    
    if (!command || command.disabled) return;
    
    try {
      await command.action();
      addToRecent(id);
      close();
    } catch (error) {
      console.error(`Failed to execute command ${id}:`, error);
    }
  },

  /**
   * 打开命令面板
   */
  open: () => set({ isOpen: true, searchQuery: '', selectedIndex: 0 }),

  /**
   * 关闭命令面板
   */
  close: () => set({ isOpen: false, searchQuery: '', selectedIndex: 0 }),

  /**
   * 切换命令面板
   */
  toggle: () => {
    const { isOpen, open, close } = get();
    if (isOpen) {
      close();
    } else {
      open();
    }
  },

  /**
   * 设置搜索查询
   */
  setSearchQuery: (query: string) => set({ searchQuery: query, selectedIndex: 0 }),

  /**
   * 清除搜索
   */
  clearSearch: () => set({ searchQuery: '', selectedIndex: 0 }),

  /**
   * 选择下一项
   */
  selectNext: () => {
    set((state) => ({
      selectedIndex: state.selectedIndex + 1,
    }));
  },

  /**
   * 选择上一项
   */
  selectPrevious: () => {
    set((state) => ({
      selectedIndex: Math.max(0, state.selectedIndex - 1),
    }));
  },

  /**
   * 设置选中索引
   */
  setSelectedIndex: (index: number) => set({ selectedIndex: index }),

  /**
   * 添加到最近使用
   */
  addToRecent: (id: string) => {
    set((state) => {
      const filtered = state.recentCommandIds.filter((recentId) => recentId !== id);
      return {
        recentCommandIds: [id, ...filtered].slice(0, MAX_RECENT_COMMANDS),
      };
    });
  },

  /**
   * 清除最近使用
   */
  clearRecent: () => set({ recentCommandIds: [] }),

  /**
   * 重置
   */
  reset: () => set(initialState),
}));

/**
 * 获取过滤后的命令列表
 */
export function useFilteredCommands(): Command[] {
  const { commands, searchQuery } = useCommandStore();
  
  const allCommands = Array.from(commands.values());
  
  if (!searchQuery.trim()) {
    return allCommands;
  }
  
  const query = searchQuery.toLowerCase();
  
  return allCommands.filter((command) => {
    // 匹配 label
    if (command.label.toLowerCase().includes(query)) return true;
    // 匹配 description
    if (command.description?.toLowerCase().includes(query)) return true;
    // 匹配 keywords
    if (command.keywords?.some((kw) => kw.toLowerCase().includes(query))) return true;
    // 匹配 category
    if (CATEGORY_LABELS[command.category].toLowerCase().includes(query)) return true;
    return false;
  });
}

/**
 * 获取按分类分组的命令
 */
export function useGroupedCommands(): Map<CommandCategory, Command[]> {
  const filteredCommands = useFilteredCommands();
  
  const grouped = new Map<CommandCategory, Command[]>();
  
  for (const command of filteredCommands) {
    const existing = grouped.get(command.category) || [];
    grouped.set(command.category, [...existing, command]);
  }
  
  return grouped;
}

/**
 * 获取最近使用的命令
 */
export function useRecentCommands(): Command[] {
  const { commands, recentCommandIds } = useCommandStore();
  
  return recentCommandIds
    .map((id) => commands.get(id))
    .filter((cmd): cmd is Command => cmd !== undefined);
}
