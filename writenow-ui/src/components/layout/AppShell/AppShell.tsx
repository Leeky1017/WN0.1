/**
 * AppShell Component
 * 
 * 三栏布局容器，整合 IconBar、Sidebar、Main Content、Panel。
 * 支持拖拽调节宽度和折叠/展开。
 * 
 * @see DESIGN_SPEC.md 4.1 AppShell
 */
import { type ReactNode, useCallback } from 'react';
import { clsx } from 'clsx';
import { useLayoutStore, LAYOUT_CONSTRAINTS } from '../../../stores/layoutStore';
import { Resizer } from '../Resizer';

export interface AppShellProps {
  /** Icon Bar 内容 */
  iconBar: ReactNode;
  /** Sidebar 内容 */
  sidebar?: ReactNode;
  /** 右侧 Panel 内容 */
  panel?: ReactNode;
  /** 主内容区 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 布局结构
 * 
 * ```
 * +------+----------+---------------------------+----------+
 * |      |          |                           |          |
 * | Icon | Sidebar  |      Main Content         |  Panel   |
 * | Bar  | (展开时)  |       (flex-1)            | (可折叠)  |
 * | 48px | 240px    |                           | 280-360px|
 * |      |          |                           |          |
 * +------+----||----+---------------------------+----||----+
 *            ↑ 可拖拽分割线                           ↑ 可拖拽分割线
 * ```
 * 
 * 像素规范
 * 
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | Icon Bar | 宽度 | 48px |
 * | | 背景 | #080808 |
 * | | 右边框 | 1px solid #222222 |
 * | Sidebar (展开) | 默认宽度 | 240px |
 * | | 最小宽度 | 180px |
 * | | 最大宽度 | 400px |
 * | Main Content | 最小宽度 | 400px |
 * | Context Panel | 默认宽度 | 280px (普通) / 360px (AI) |
 * | | 最小宽度 | 240px |
 * | | 最大宽度 | 480px |
 * | 分割线 | 宽度 | 8px (可点击区域) / 1px (可见) |
 */
export function AppShell({
  iconBar,
  sidebar,
  panel,
  children,
  className,
}: AppShellProps) {
  const {
    sidebarWidth,
    sidebarCollapsed,
    panelWidth,
    panelCollapsed,
    setSidebarWidth,
    setPanelWidth,
  } = useLayoutStore();

  // Sidebar 拖拽处理
  const handleSidebarResize = useCallback(
    (delta: number) => {
      const newWidth = sidebarWidth + delta;
      setSidebarWidth(newWidth);
    },
    [sidebarWidth, setSidebarWidth]
  );

  // Panel 拖拽处理
  const handlePanelResize = useCallback(
    (delta: number) => {
      // Panel 的 delta 方向是反的（向左拖拽增加宽度）
      const newWidth = panelWidth - delta;
      setPanelWidth(newWidth);
    },
    [panelWidth, setPanelWidth]
  );

  const showSidebar = sidebar && !sidebarCollapsed;
  const showPanel = panel && !panelCollapsed;

  return (
    <div
      className={clsx(
        'w-screen h-screen overflow-hidden',
        'flex',
        'bg-[var(--color-bg-body)]',
        className
      )}
    >
      {/* Icon Bar - 始终可见 */}
      <div className="shrink-0">
        {iconBar}
      </div>

      {/* Sidebar Content - 可折叠 */}
      {showSidebar && (
        <>
          <div
            className="h-full shrink-0 overflow-hidden border-r border-[var(--color-border-default)]"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </div>

          {/* Sidebar Resizer */}
          <Resizer
            onResize={handleSidebarResize}
            direction="right"
          />
        </>
      )}

      {/* Main Content */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ minWidth: LAYOUT_CONSTRAINTS.mainContent.min }}
      >
        {children}
      </main>

      {/* Panel Resizer + Panel - 可折叠 */}
      {showPanel && (
        <>
          {/* Panel Resizer */}
          <Resizer
            onResize={handlePanelResize}
            direction="left"
          />

          {/* Context Panel */}
          <aside
            className="h-full shrink-0 overflow-hidden border-l border-[var(--color-border-default)]"
            style={{ width: panelWidth }}
          >
            {panel}
          </aside>
        </>
      )}
    </div>
  );
}

AppShell.displayName = 'AppShell';
