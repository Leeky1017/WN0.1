/**
 * Layout Components
 * 
 * 布局组件，构成应用的页面骨架。
 * 
 * @see DESIGN_SPEC.md 第四部分：布局组件规范
 */

// AppShell - 三栏布局容器
export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';

// IconBar - 图标导航条
export { IconBar } from './IconBar';
export type { IconBarProps, IconBarItem } from './IconBar';

// Resizer - 可拖拽分割线
export { Resizer } from './Resizer';
export type { ResizerProps } from './Resizer';

// Sidebar - 侧边栏组件
export { SidebarContent, SidebarSection, SidebarItem } from './Sidebar';
export type {
  SidebarContentProps,
  SidebarSectionProps,
  SidebarItemProps,
} from './Sidebar';

// Panel - 右侧面板
export { Panel } from './Panel';
export type { PanelProps, PanelVariant } from './Panel';

// Toolbar - 顶部工具栏
export { Toolbar, ToolbarGroup, ToolbarDivider } from './Toolbar';
export type {
  ToolbarProps,
  ToolbarSize,
  ToolbarGroupProps,
  ToolbarDividerProps,
} from './Toolbar';
