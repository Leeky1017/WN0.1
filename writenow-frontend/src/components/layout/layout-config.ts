/**
 * FlexLayout 默认布局配置
 * Figma 样式改造：FileTree 已移到外层 SidebarPanel
 * @see design/03-layout-system.md
 */
import type { IJsonModel } from 'flexlayout-react';

export const LAYOUT_STORAGE_KEY = 'writenow-layout';
export const LAYOUT_VERSION = 2; // 升级版本以清除旧的缓存布局

/**
 * 面板组件类型
 * Why: FileTree 已移到外层 SidebarPanel，从 FlexLayout 中移除
 */
export type PanelComponent =
  | 'FileTree' // 保留类型以兼容可能存在的旧布局
  | 'Editor'
  | 'AIPanel'
  | 'VersionHistory'
  | 'Welcome'
  | 'UiShowcase';

/**
 * 默认布局配置
 * 两区布局：中间编辑器区域（含底部面板）+ 右侧 AI 面板
 * FileTree 已移到外层 SidebarPanel
 */
export const defaultLayout: IJsonModel = {
  global: {
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
    tabEnableRename: false,
    splitterSize: 4,
    splitterExtra: 4,
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // 中间编辑器区域（含底部面板）
      {
        type: 'row',
        weight: 75,
        children: [
          {
            type: 'tabset',
            id: 'editor',
            weight: 70,
            children: [
              {
                type: 'tab',
                name: '欢迎',
                component: 'Welcome',
                enableClose: false,
              },
            ],
          },
          // 底部面板（版本历史等）
          {
            type: 'tabset',
            id: 'bottom',
            weight: 30,
            minHeight: 160,
            children: [
              {
                type: 'tab',
                name: '版本历史',
                component: 'VersionHistory',
              },
              {
                type: 'tab',
                name: '组件',
                component: 'UiShowcase',
              },
            ],
          },
        ],
      },
      // 右侧 AI 面板
      {
        type: 'tabset',
        id: 'ai',
        weight: 25,
        minWidth: 280,
        children: [
          {
            type: 'tab',
            name: 'AI 助手',
            component: 'AIPanel',
            enableClose: false,
          },
        ],
      },
    ],
  },
};

/**
 * 布局持久化存储格式
 */
export interface StoredLayout {
  version: number;
  layout: IJsonModel;
  timestamp: number;
}
