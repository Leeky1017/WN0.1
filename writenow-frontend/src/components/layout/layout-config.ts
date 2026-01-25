/**
 * FlexLayout 默认布局配置
 * @see design/03-layout-system.md
 */
import type { IJsonModel } from 'flexlayout-react';

export const LAYOUT_STORAGE_KEY = 'writenow-layout';
export const LAYOUT_VERSION = 1;

/**
 * 面板组件类型
 */
export type PanelComponent = 
  | 'FileTree'
  | 'Editor'
  | 'AIPanel'
  | 'VersionHistory'
  | 'Welcome';

/**
 * 默认布局配置
 * 四区布局：左侧文件树、中间编辑器、右侧 AI 面板、底部可选面板
 */
export const defaultLayout: IJsonModel = {
  global: {
    tabEnableFloat: false,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
    tabSetTabStripHeight: 32,
    tabEnableRename: false,
    splitterSize: 4,
    splitterExtra: 4,
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      // 左侧文件树
      {
        type: 'tabset',
        weight: 20,
        minWidth: 180,
        children: [
          {
            type: 'tab',
            name: '文件',
            component: 'FileTree',
            enableClose: false,
          },
        ],
      },
      // 中间编辑器区域（含底部面板）
      {
        type: 'row',
        weight: 60,
        children: [
          {
            type: 'tabset',
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
          // 底部面板（版本历史等）- 暂时注释，Phase 2+ 启用
          // {
          //   type: 'tabset',
          //   weight: 30,
          //   children: [
          //     {
          //       type: 'tab',
          //       name: '版本历史',
          //       component: 'VersionHistory',
          //     },
          //   ],
          // },
        ],
      },
      // 右侧 AI 面板
      {
        type: 'tabset',
        weight: 20,
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
