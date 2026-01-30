/**
 * Settings Store
 *
 * 用户设置状态管理，支持 localStorage 持久化。
 *
 * @see DESIGN_SPEC.md 11.2.2 Settings Schema
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/** 写作体验设置 */
export interface WritingSettings {
  /** 专注模式 - 隐藏侧边栏和工具栏 */
  focusMode: boolean;
  /** 打字机滚动 - 光标始终保持在屏幕中央 */
  typewriterScroll: boolean;
  /** 智能标点 - 自动替换标点符号 */
  smartPunctuation: boolean;
  /** 自动配对括号 */
  autoPairBrackets: boolean;
}

/** 数据与存储设置 */
export interface DataSettings {
  /** 自动保存开启 */
  autoSaveEnabled: boolean;
  /** 自动保存间隔 (秒) */
  autoSaveInterval: number;
  /** 备份开启 */
  backupEnabled: boolean;
  /** 备份频率 */
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

/** 外观设置 */
export interface AppearanceSettings {
  /** 主题模式 */
  theme: 'light' | 'dark' | 'system';
  /** UI 字体 */
  uiFont: string;
  /** 编辑器字体 */
  editorFont: string;
  /** 字号 (px) */
  fontSize: number;
  /** 行高 (倍数) */
  lineHeight: number;
  /** 界面缩放 (百分比) */
  interfaceScale: number;
}

/** 完整用户设置 */
export interface UserSettings {
  writing: WritingSettings;
  data: DataSettings;
  appearance: AppearanceSettings;
}

/** 设置导航项 */
export type SettingsSection = 'writing' | 'data' | 'appearance';

/** Store 状态 */
export interface SettingsState {
  /** 当前选中的设置分区 */
  activeSection: SettingsSection;
  /** 用户设置 */
  settings: UserSettings;

  // Actions
  /** 设置当前分区 */
  setActiveSection: (section: SettingsSection) => void;
  /** 更新写作设置 */
  updateWritingSettings: (updates: Partial<WritingSettings>) => void;
  /** 更新数据设置 */
  updateDataSettings: (updates: Partial<DataSettings>) => void;
  /** 更新外观设置 */
  updateAppearanceSettings: (updates: Partial<AppearanceSettings>) => void;
  /** 重置为默认设置 */
  resetSettings: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

/** 默认写作设置 */
const DEFAULT_WRITING_SETTINGS: WritingSettings = {
  focusMode: false,
  typewriterScroll: false,
  smartPunctuation: true,
  autoPairBrackets: true,
};

/** 默认数据设置 */
const DEFAULT_DATA_SETTINGS: DataSettings = {
  autoSaveEnabled: true,
  autoSaveInterval: 3, // 3 秒
  backupEnabled: true,
  backupFrequency: 'daily',
};

/** 默认外观设置 */
const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'dark',
  uiFont: 'Inter',
  editorFont: 'Lora',
  fontSize: 16,
  lineHeight: 1.6,
  interfaceScale: 100,
};

/** 默认用户设置 */
const DEFAULT_SETTINGS: UserSettings = {
  writing: DEFAULT_WRITING_SETTINGS,
  data: DEFAULT_DATA_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Settings Store
 *
 * 使用 persist 中间件将设置持久化到 localStorage。
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // State
      activeSection: 'writing',
      settings: DEFAULT_SETTINGS,

      // Actions
      setActiveSection: (section) => set({ activeSection: section }),

      updateWritingSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            writing: { ...state.settings.writing, ...updates },
          },
        })),

      updateDataSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            data: { ...state.settings.data, ...updates },
          },
        })),

      updateAppearanceSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...updates },
          },
        })),

      resetSettings: () =>
        set({
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'writenow-settings',
      storage: createJSONStorage(() => localStorage),
      // 只持久化 settings，不持久化 activeSection
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// ============================================================================
// Selectors (便捷钩子)
// ============================================================================

/** 获取写作设置 */
export const useWritingSettings = () =>
  useSettingsStore((state) => state.settings.writing);

/** 获取数据设置 */
export const useDataSettings = () =>
  useSettingsStore((state) => state.settings.data);

/** 获取外观设置 */
export const useAppearanceSettings = () =>
  useSettingsStore((state) => state.settings.appearance);

/** 获取当前分区 */
export const useActiveSection = () =>
  useSettingsStore((state) => state.activeSection);
