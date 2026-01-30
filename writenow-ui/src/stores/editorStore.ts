/**
 * Editor Store
 * 
 * Zustand store 管理编辑器状态：
 * - 当前文档路径
 * - 文档脏状态（是否有未保存更改）
 * - 保存状态
 * - 文档内容缓存
 * 
 * @see DESIGN_SPEC.md 7.3 Editor 页面
 */
import { create } from 'zustand';
import type { Project } from './projectStore';

/**
 * 保存状态
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * 文档元数据
 */
export interface DocumentMeta {
  /** 字数 */
  wordCount: number;
  /** 字符数 */
  charCount: number;
  /** 阅读时间（分钟） */
  readTime: number;
  /** 最后修改时间 */
  lastModified: string | null;
}

/**
 * 编辑器状态
 */
export interface EditorState {
  // 当前项目
  currentProject: Project | null;
  
  // 文档状态
  documentPath: string | null;
  documentContent: string;
  isDirty: boolean;
  saveStatus: SaveStatus;
  
  // 文档元数据
  meta: DocumentMeta;
  
  // 编辑器配置
  isFullscreen: boolean;
  showDetails: boolean;
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setDocumentPath: (path: string | null) => void;
  setDocumentContent: (content: string) => void;
  updateContent: (content: string) => void;
  markDirty: () => void;
  markClean: () => void;
  
  // 保存相关
  setSaveStatus: (status: SaveStatus) => void;
  save: () => Promise<void>;
  
  // 元数据
  updateMeta: (content: string) => void;
  
  // UI 状态
  setFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  setShowDetails: (show: boolean) => void;
  toggleDetails: () => void;
  
  // 重置
  reset: () => void;
}

/**
 * 计算文档元数据
 */
function calculateMeta(content: string): DocumentMeta {
  // 去除 HTML 标签计算纯文本
  const text = content.replace(/<[^>]*>/g, '');
  
  // 字符数
  const charCount = text.length;
  
  // 字数（按空格/标点分割）
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  // 阅读时间（假设 200 词/分钟）
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  
  return {
    wordCount,
    charCount,
    readTime,
    lastModified: new Date().toISOString(),
  };
}

const initialMeta: DocumentMeta = {
  wordCount: 0,
  charCount: 0,
  readTime: 0,
  lastModified: null,
};

const initialState = {
  currentProject: null,
  documentPath: null,
  documentContent: '',
  isDirty: false,
  saveStatus: 'idle' as SaveStatus,
  meta: initialMeta,
  isFullscreen: false,
  showDetails: true,
};

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...initialState,

  setCurrentProject: (project) => set({ currentProject: project }),

  setDocumentPath: (path) => set({ documentPath: path }),

  setDocumentContent: (content) => {
    set({ 
      documentContent: content,
      isDirty: false,
      meta: calculateMeta(content),
    });
  },

  /**
   * 更新内容并标记为脏
   */
  updateContent: (content) => {
    set({ 
      documentContent: content,
      isDirty: true,
      saveStatus: 'idle',
      meta: calculateMeta(content),
    });
  },

  markDirty: () => set({ isDirty: true, saveStatus: 'idle' }),

  markClean: () => set({ isDirty: false }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  /**
   * 保存文档
   * 
   * 后续对接 file:write IPC
   */
  save: async () => {
    const { isDirty, currentProject } = get();
    
    if (!isDirty || !currentProject) {
      return;
    }
    
    // TODO: 使用 documentContent 对接 window.api.invoke('file:write', { projectId, content })
    // const { documentContent } = get();
    
    set({ saveStatus: 'saving' });
    
    try {
      // TODO: 对接 window.api.invoke('file:write', { projectId, content })
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      set({ 
        isDirty: false, 
        saveStatus: 'saved',
        meta: {
          ...get().meta,
          lastModified: new Date().toISOString(),
        },
      });
      
      // 2秒后重置为 idle
      setTimeout(() => {
        set({ saveStatus: 'idle' });
      }, 2000);
    } catch {
      set({ saveStatus: 'error' });
    }
  },

  updateMeta: (content) => {
    set({ meta: calculateMeta(content) });
  },

  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

  setShowDetails: (show) => set({ showDetails: show }),

  toggleDetails: () => set((state) => ({ showDetails: !state.showDetails })),

  reset: () => set(initialState),
}));

/**
 * 获取保存状态显示文本
 */
export function useSaveStatusText(): string {
  const { saveStatus, isDirty } = useEditorStore();
  
  switch (saveStatus) {
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed';
    default:
      return isDirty ? 'Unsaved changes' : '';
  }
}
