/**
 * Layout Store
 * 
 * Zustand store 管理布局状态：
 * - sidebarWidth / panelWidth
 * - sidebarCollapsed / panelCollapsed
 * 
 * @see DESIGN_SPEC.md 4.1 AppShell
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 布局约束常量
 * 
 * | 元素 | 默认 | 最小 | 最大 |
 * |------|------|------|------|
 * | Sidebar | 240px | 180px | 400px |
 * | Panel (普通) | 280px | 240px | 480px |
 * | Panel (AI) | 360px | 240px | 480px |
 */
export const LAYOUT_CONSTRAINTS = {
  iconBar: {
    width: 48,
  },
  sidebar: {
    default: 240,
    min: 180,
    max: 400,
  },
  panel: {
    default: 280,
    aiDefault: 360,
    min: 240,
    max: 480,
  },
  toolbar: {
    default: 60,
    large: 80,
  },
  mainContent: {
    min: 400,
  },
} as const;

export type PanelVariant = 'default' | 'ai';

export interface LayoutState {
  // Sidebar 状态
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  
  // Panel 状态
  panelWidth: number;
  panelCollapsed: boolean;
  panelVariant: PanelVariant;
  
  // 当前活动的 Icon Bar 项
  activeIconBarItem: string;
  
  // Actions
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  
  setPanelWidth: (width: number) => void;
  setPanelCollapsed: (collapsed: boolean) => void;
  togglePanel: () => void;
  setPanelVariant: (variant: PanelVariant) => void;
  
  setActiveIconBarItem: (id: string) => void;
  
  // 重置
  reset: () => void;
}

const initialState = {
  sidebarWidth: LAYOUT_CONSTRAINTS.sidebar.default,
  sidebarCollapsed: false,
  panelWidth: LAYOUT_CONSTRAINTS.panel.default,
  panelCollapsed: false,
  panelVariant: 'default' as PanelVariant,
  activeIconBarItem: 'projects',
};

/**
 * 确保宽度在有效范围内
 */
function clampSidebarWidth(width: number): number {
  return Math.max(
    LAYOUT_CONSTRAINTS.sidebar.min,
    Math.min(LAYOUT_CONSTRAINTS.sidebar.max, width)
  );
}

function clampPanelWidth(width: number): number {
  return Math.max(
    LAYOUT_CONSTRAINTS.panel.min,
    Math.min(LAYOUT_CONSTRAINTS.panel.max, width)
  );
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...initialState,

      setSidebarWidth: (width: number) =>
        set({ sidebarWidth: clampSidebarWidth(width) }),

      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setPanelWidth: (width: number) =>
        set({ panelWidth: clampPanelWidth(width) }),

      setPanelCollapsed: (collapsed: boolean) =>
        set({ panelCollapsed: collapsed }),

      togglePanel: () =>
        set((state) => ({ panelCollapsed: !state.panelCollapsed })),

      setPanelVariant: (variant: PanelVariant) =>
        set({
          panelVariant: variant,
          // 切换到 AI 面板时自动调整宽度
          panelWidth:
            variant === 'ai'
              ? LAYOUT_CONSTRAINTS.panel.aiDefault
              : LAYOUT_CONSTRAINTS.panel.default,
        }),

      setActiveIconBarItem: (id: string) =>
        set({ activeIconBarItem: id }),

      reset: () => set(initialState),
    }),
    {
      name: 'writenow-layout',
      // 只持久化部分状态
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        sidebarCollapsed: state.sidebarCollapsed,
        panelWidth: state.panelWidth,
        panelCollapsed: state.panelCollapsed,
      }),
    }
  )
);
