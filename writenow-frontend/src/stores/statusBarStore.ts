/**
 * StatusBar Store - 状态栏状态管理
 * 使用 Zustand 管理状态栏数据
 */
import { create } from 'zustand';

import type { IpcErrorCode } from '@/types/ipc-generated';

/**
 * AI 状态类型
 */
export type AIStatus = 'idle' | 'thinking' | 'streaming' | 'error';

/**
 * 保存状态类型
 */
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface SaveErrorInfo {
  code: IpcErrorCode;
  message: string;
}

/**
 * 光标位置
 */
export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * 状态栏 Store 接口
 */
interface StatusBarState {
  /** 光标位置 */
  cursorPosition: CursorPosition;
  /** 字数统计 */
  wordCount: number;
  /** 字符数统计 */
  charCount: number;
  /** 文档类型 */
  documentType: string;
  /** AI 状态 */
  aiStatus: AIStatus;
  /** AI 状态消息 */
  aiStatusMessage: string;
  /** 保存状态 */
  saveStatus: SaveStatus;
  /** 保存失败信息（仅当 saveStatus === 'error'） */
  saveError: SaveErrorInfo | null;
  /** 最近一次保存成功时间戳（ms） */
  lastSavedAt: number | null;
  /** 连接状态 */
  isConnected: boolean;

  // Actions
  setCursorPosition: (position: CursorPosition) => void;
  setWordCount: (count: number) => void;
  setCharCount: (count: number) => void;
  setDocumentType: (type: string) => void;
  setAIStatus: (status: AIStatus, message?: string) => void;
  setSaveStatus: (status: SaveStatus, error?: SaveErrorInfo | null) => void;
  setLastSavedAt: (timestamp: number | null) => void;
  setConnectionStatus: (connected: boolean) => void;
}

/**
 * 状态栏 Zustand Store
 */
export const useStatusBarStore = create<StatusBarState>((set) => ({
  // 初始状态
  cursorPosition: { line: 1, column: 1 },
  wordCount: 0,
  charCount: 0,
  documentType: 'Markdown',
  aiStatus: 'idle',
  aiStatusMessage: '',
  saveStatus: 'saved',
  saveError: null,
  lastSavedAt: null,
  isConnected: false,

  // Actions
  setCursorPosition: (position) => set({ cursorPosition: position }),
  setWordCount: (count) => set({ wordCount: count }),
  setCharCount: (count) => set({ charCount: count }),
  setDocumentType: (type) => set({ documentType: type }),
  setAIStatus: (status, message = '') => set({ aiStatus: status, aiStatusMessage: message }),
  setSaveStatus: (status, error = null) =>
    set({
      saveStatus: status,
      saveError: status === 'error' ? error : null,
    }),
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
  setConnectionStatus: (connected) => set({ isConnected: connected }),
}));

export default useStatusBarStore;
