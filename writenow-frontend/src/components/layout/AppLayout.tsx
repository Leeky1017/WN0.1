/**
 * AppLayout - IDE 级别的可拖拽布局系统
 * 使用 FlexLayout 实现四区布局
 * @see design/03-layout-system.md
 */
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { Layout, Model, TabNode, ITabSetRenderValues, Action, Actions } from 'flexlayout-react';
import type { PanelComponent } from './layout-config';
import { loadLayout, saveLayout } from '@/lib/layout/persistence';
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
          版本历史（Phase 2 实现）
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

/**
 * 自定义 TabSet 头部渲染
 * 可添加 toolbar 按钮等
 */
function renderTabSet(
  _node: TabNode | undefined,
  renderValues: ITabSetRenderValues
): void {
  // 可以在这里添加自定义按钮
  // renderValues.buttons.push(<CustomButton key="custom" />);
  
  // 保留默认行为
  void renderValues;
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
  
  // 初始化 Model（从 localStorage 加载或使用默认布局）
  const model = useMemo(() => {
    const layoutJson = loadLayout();
    return Model.fromJson(layoutJson);
  }, []);
  
  // 处理布局变化，保存到 localStorage
  const handleModelChange = useCallback((model: Model) => {
    // 使用 requestIdleCallback 进行防抖保存，避免频繁写入
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => saveLayout(model), { timeout: 1000 });
    } else {
      setTimeout(() => saveLayout(model), 500);
    }
  }, []);
  
  // 处理 Action（可用于拦截特定操作）
  const handleAction = useCallback((action: Action): Action | undefined => {
    // 可以在这里拦截特定 action，例如阻止关闭某些 tab
    return action;
  }, []);
  
  // 添加键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ 重置布局
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        if (layoutRef.current) {
          const defaultLayoutJson = loadLayout();
          layoutRef.current.props.model.doAction(
            Actions.updateModelAttributes({ rootOrientation: 'row' })
          );
          console.log('[Layout] Layout reset triggered');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`h-full w-full ${className}`}>
      <Layout
        ref={layoutRef}
        model={model}
        factory={PanelFactory}
        onModelChange={handleModelChange}
        onAction={handleAction}
        onRenderTabSet={renderTabSet}
        realtimeResize={true}
      />
    </div>
  );
}

export default AppLayout;
