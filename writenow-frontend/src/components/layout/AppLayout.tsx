/**
 * AppLayout - IDE 级别的可拖拽布局系统
 * 使用 FlexLayout 实现四区布局
 * @see design/03-layout-system.md
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Action, Actions, DockLocation, Layout, Model, TabNode } from 'flexlayout-react';
import type { PanelComponent } from './layout-config';
import { LayoutApiProvider } from './layout-api-provider';
import type { LayoutApi } from './layout-api-context';
import { loadLayout, saveLayout } from '@/lib/layout/persistence';
import { useEditorFilesStore, useLayoutStore } from '@/stores';
import { FileTreePanel } from '@/features/file-tree/FileTreePanel';
import { EditorPanel } from '@/features/editor/EditorPanel';
import { AIPanelPlaceholder } from '@/features/ai-panel/AIPanelPlaceholder';
import { WelcomePanel } from '@/features/editor/WelcomePanel';

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
      return <AIPanelPlaceholder />;
    case 'Welcome':
      return <WelcomePanel />;
    case 'VersionHistory':
      return (
        <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
          版本历史（Phase 5 实现）
        </div>
      );
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
}

/**
 * 主应用布局组件
 */
export function AppLayout({ className = '' }: AppLayoutProps) {
  const layoutRef = useRef<Layout>(null);
  const resetToken = useLayoutStore((state) => state.resetToken);
  const resetLayout = useLayoutStore((state) => state.resetLayout);
  const refreshHasStoredLayout = useLayoutStore((state) => state.refreshHasStoredLayout);
  
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
            }
          }
        }
      }
    }

    return action;
  }, [model]);

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
  
  // 添加键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ 重置布局
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        resetLayout();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetLayout]);

  return (
    <LayoutApiProvider api={layoutApi}>
      <div className={`h-full w-full ${className}`}>
        <Layout
          ref={layoutRef}
          model={model}
          factory={PanelFactory}
          onModelChange={handleModelChange}
          onAction={handleAction}
          realtimeResize={true}
        />
      </div>
    </LayoutApiProvider>
  );
}

export default AppLayout;
