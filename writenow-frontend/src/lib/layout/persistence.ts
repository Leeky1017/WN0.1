/**
 * 布局持久化工具
 * @see design/03-layout-system.md
 */
import { Model } from 'flexlayout-react';
import type { IJsonModel } from 'flexlayout-react';
import { 
  LAYOUT_STORAGE_KEY, 
  LAYOUT_VERSION, 
  defaultLayout,
  type StoredLayout,
} from '@/components/layout/layout-config';

/**
 * 保存布局到 localStorage
 * @param model FlexLayout model instance
 */
export function saveLayout(model: Model): void {
  try {
    const stored: StoredLayout = {
      version: LAYOUT_VERSION,
      layout: model.toJson(),
      timestamp: Date.now(),
    };
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error('[Layout] Failed to save layout:', error);
  }
}

/**
 * 从 localStorage 加载布局
 * @returns 布局配置，加载失败时返回默认布局
 */
export function loadLayout(): IJsonModel {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      console.log('[Layout] No saved layout found, using default');
      return defaultLayout;
    }

    const stored: StoredLayout = JSON.parse(raw);

    // 版本检查
    if (stored.version !== LAYOUT_VERSION) {
      console.warn('[Layout] Layout version mismatch, using default');
      return defaultLayout;
    }

    console.log('[Layout] Loaded saved layout from', new Date(stored.timestamp).toLocaleString());
    return stored.layout;
  } catch (error) {
    console.error('[Layout] Failed to load layout:', error);
    return defaultLayout;
  }
}

/**
 * 重置布局为默认配置
 */
export function resetLayout(): void {
  localStorage.removeItem(LAYOUT_STORAGE_KEY);
  console.log('[Layout] Layout reset to default');
}

/**
 * 检查是否有保存的布局
 */
export function hasStoredLayout(): boolean {
  return localStorage.getItem(LAYOUT_STORAGE_KEY) !== null;
}
