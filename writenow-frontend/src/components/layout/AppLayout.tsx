/**
 * AppLayout - IDE 级别的可拖拽布局系统
 * 使用 FlexLayout 实现四区布局
 * @see design/03-layout-system.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Action, Actions, DockLocation, Layout, Model, TabNode } from 'flexlayout-react';
import type { BorderNode, TabSetNode } from 'flexlayout-react';
import type { PanelComponent } from './layout-config';
import { LayoutApiProvider } from './layout-api-provider';
import type { LayoutApi } from './layout-api-context';
import { loadLayout, saveLayout } from '@/lib/layout/persistence';
import { useEditorFilesStore, useEditorRuntimeStore, useLayoutStore } from '@/stores';
import { FileTreePanel } from '@/features/file-tree/FileTreePanel';
import { EditorPanel } from '@/features/editor/EditorPanel';
import { AIPanel } from '@/features/ai-panel/AIPanel';
import { WelcomePanel } from '@/features/editor/WelcomePanel';
import { VersionHistoryPanel } from '@/features/version-history/VersionHistoryPanel';
import { UiShowcasePanel } from '@/features/dev/UiShowcasePanel';
import { TabContextMenu, type TabContextMenuAction } from './TabContextMenu';

// 导入 FlexLayout 样式
import 'flexlayout-react/style/dark.css';
import '@/styles/flexlayout-overrides.css';

/**
 * 面板组件工厂函数
 * 根据 component 类型渲染对应的面板组件
 */
function PanelFactory(node: TabNode): React.ReactNode {
  const component = node.getComponent() as PanelComponent;
  
  switch (component) {
    case 'FileTree':
      return <FileTreePanel />;
    case 'Editor':
      return <EditorPanel filePath={node.getConfig()?.filePath as string | undefined} />;
    case 'AIPanel':
      return <AIPanel />;
    case 'Welcome':
      return <WelcomePanel />;
    case 'VersionHistory':
      return <VersionHistoryPanel />;
    case 'UiShowcase':
      return <UiShowcasePanel />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
          未知面板: {component}
        </div>
      );
  }
}

interface AppLayoutProps {
  /** 可选的初始布局配置，不传则从 localStorage 加载 */
  className?: string;
  /**
   * Optional callback to expose the LayoutApi to app-level overlays (cmdk/settings).
   * Why: Overlays are rendered outside FlexLayout's PanelFactory but still need explicit access to layout actions.
   */
  onApiReady?: (api: LayoutApi) => void;
}

/**
 * 主应用布局组件
 */
export function AppLayout({ className = '', onApiReady }: AppLayoutProps) {
  const layoutRef = useRef<Layout>(null);
  const resetToken = useLayoutStore((state) => state.resetToken);
  const resetLayout = useLayoutStore((state) => state.resetLayout);
  const refreshHasStoredLayout = useLayoutStore((state) => state.refreshHasStoredLayout);

  const [tabContextMenu, setTabContextMenu] = useState<{
    tabId: string;
    tabsetId: string | null;
    position: { x: number; y: number };
  } | null>(null);
  
  // 初始化 Model（从 localStorage 加载或使用默认布局）
  const model = useMemo(() => {
    void resetToken;
    const layoutJson = loadLayout();
    return Model.fromJson(layoutJson);
  }, [resetToken]);
  
  // 处理布局变化，保存到 localStorage
  const handleModelChange = useCallback((model: Model) => {
    // 使用 requestIdleCallback 进行防抖保存，避免频繁写入
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        saveLayout(model);
        refreshHasStoredLayout();
      }, { timeout: 1000 });
    } else {
      setTimeout(() => {
        saveLayout(model);
        refreshHasStoredLayout();
      }, 500);
    }
  }, [refreshHasStoredLayout]);
  
  // 处理 Action（可用于拦截特定操作）
  const handleAction = useCallback((action: Action): Action | undefined => {
    // Intercept editor tab closing when there are unsaved changes.
    if (action.type === Actions.DELETE_TAB) {
      const tabId = (action.data as { node?: unknown } | undefined)?.node;
      if (typeof tabId === 'string') {
        const node = model.getNodeById(tabId);
        if (node && node.getType() === 'tab') {
          const tab = node as TabNode;
          const component = tab.getComponent() as PanelComponent;
          if (component === 'Editor') {
            const config = tab.getConfig() as { filePath?: unknown } | undefined;
            const filePath = typeof config?.filePath === 'string' ? config.filePath : '';
            if (filePath && useEditorFilesStore.getState().getDirty(filePath)) {
              const ok = window.confirm('该文件有未保存修改，仍要关闭吗？');
              if (!ok) return undefined;
            }

            // Remove cached state once the tab is allowed to close.
            if (filePath) {
              useEditorFilesStore.getState().remove(filePath);
              useEditorRuntimeStore.getState().clearForFile(filePath);
            }
          }
        }
      }
    }

    return action;
  }, [model]);

  const closeTabContextMenu = useCallback(() => {
    setTabContextMenu(null);
  }, []);

  const handleTabContextMenuAction = useCallback(
    (action: TabContextMenuAction) => {
      const menu = tabContextMenu;
      if (!menu) return;
      closeTabContextMenu();

      if (action === 'close') {
        model.doAction(Actions.deleteTab(menu.tabId));
        return;
      }

      const tabsetId = menu.tabsetId;
      if (!tabsetId) return;
      const node = model.getNodeById(tabsetId);
      if (!node || node.getType() !== 'tabset') return;

      const tabs = node
        .getChildren()
        .filter((child): child is TabNode => child.getType() === 'tab')
        .filter((tab) => tab.getComponent() === 'Editor');

      const toClose =
        action === 'close-all'
          ? tabs
          : tabs.filter((tab) => tab.getId() !== menu.tabId);

      for (const tab of toClose) {
        model.doAction(Actions.deleteTab(tab.getId()));
      }
    },
    [closeTabContextMenu, model, tabContextMenu],
  );

  const handleLayoutContextMenu = useCallback(
    (node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      // Only add editor tab actions for now.
      if (node.getType() !== 'tab') return;
      const tab = node as TabNode;
      if (tab.getComponent() !== 'Editor') return;

      event.preventDefault();
      event.stopPropagation();

      setTabContextMenu({
        tabId: tab.getId(),
        tabsetId: tab.getParent()?.getId() ?? null,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    [],
  );

  const openEditorTab = useCallback(
    (filePath: string) => {
      const normalizedPath = filePath.trim();
      if (!normalizedPath) return;

      let existingTabId: string | null = null;
      model.visitNodes((node) => {
        if (existingTabId) return;
        if (node.getType() !== 'tab') return;
        const tab = node as TabNode;
        if (tab.getComponent() !== 'Editor') return;
        const config = tab.getConfig() as { filePath?: unknown } | undefined;
        if (config?.filePath === normalizedPath) existingTabId = tab.getId();
      });

      if (existingTabId) {
        model.doAction(Actions.selectTab(existingTabId));
        return;
      }

      const fileName = normalizedPath.split('/').pop() || normalizedPath;
      model.doAction(
        Actions.addNode(
          {
            type: 'tab',
            component: 'Editor',
            name: fileName,
            config: { filePath: normalizedPath },
          },
          'editor',
          DockLocation.CENTER,
          -1,
          true,
        ),
      );
    },
    [model],
  );

  const setEditorTabDirty = useCallback(
    (filePath: string, isDirty: boolean) => {
      const normalizedPath = filePath.trim();
      if (!normalizedPath) return;

      let tabId: string | null = null;
      model.visitNodes((node) => {
        if (tabId) return;
        if (node.getType() !== 'tab') return;
        const tab = node as TabNode;
        if (tab.getComponent() !== 'Editor') return;
        const config = tab.getConfig() as { filePath?: unknown } | undefined;
        if (config?.filePath === normalizedPath) tabId = tab.getId();
      });
      if (!tabId) return;

      const fileName = normalizedPath.split('/').pop() || normalizedPath;
      const name = isDirty ? `● ${fileName}` : fileName;
      model.doAction(Actions.renameTab(tabId, name));
    },
    [model],
  );

  const focusAiPanel = useCallback(() => {
    let aiTabId: string | null = null;
    model.visitNodes((node) => {
      if (aiTabId) return;
      if (node.getType() !== 'tab') return;
      const tab = node as TabNode;
      if (tab.getComponent() === 'AIPanel') aiTabId = tab.getId();
    });
    if (aiTabId) {
      model.doAction(Actions.selectTab(aiTabId));
    }
  }, [model]);

  const layoutApi = useMemo<LayoutApi>(
    () => ({ openEditorTab, focusAiPanel, setEditorTabDirty }),
    [focusAiPanel, openEditorTab, setEditorTabDirty],
  );

  useEffect(() => {
    onApiReady?.(layoutApi);
  }, [layoutApi, onApiReady]);
  
  // 添加键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ 重置布局
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        resetLayout();
      }

      // Ctrl+Tab 切换编辑器标签页（在当前活跃 tabset 内循环）
      if (e.ctrlKey && e.key === 'Tab') {
        const tabset = model.getActiveTabset();
        if (!tabset) return;

        const tabs = tabset
          .getChildren()
          .filter((child): child is TabNode => child.getType() === 'tab');
        if (tabs.length <= 1) return;

        const isEditorTabset = tabs.some((tab) => {
          const component = tab.getComponent() as PanelComponent;
          return component === 'Editor' || component === 'Welcome';
        });
        if (!isEditorTabset) return;

        const selected = tabset.getSelectedNode();
        if (!selected || selected.getType() !== 'tab') return;

        const currentIndex = tabs.findIndex((tab) => tab.getId() === selected.getId());
        if (currentIndex < 0) return;

        e.preventDefault();
        const offset = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
        model.doAction(Actions.selectTab(tabs[nextIndex].getId()));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [model, resetLayout]);

  return (
    <LayoutApiProvider api={layoutApi}>
      <div className={`h-full w-full ${className}`} data-testid="layout-main">
        <Layout
          ref={layoutRef}
          model={model}
          factory={PanelFactory}
          onModelChange={handleModelChange}
          onAction={handleAction}
          onContextMenu={handleLayoutContextMenu}
          realtimeResize={true}
        />
      </div>

      {tabContextMenu && (
        <TabContextMenu
          position={tabContextMenu.position}
          onClose={closeTabContextMenu}
          onAction={handleTabContextMenuAction}
        />
      )}
    </LayoutApiProvider>
  );
}

export default AppLayout;
