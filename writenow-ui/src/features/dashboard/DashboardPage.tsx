/**
 * DashboardPage
 * 
 * 仪表盘页面，使用 AppShell 三栏布局展示项目列表。
 * 
 * @see DESIGN_SPEC.md 7.2 Dashboard 页面
 * @see design-a2aabb70
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Search, Bot, Clock, Settings, Plus } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { IconBar, type IconBarItem } from '../../components/layout/IconBar';
import { Toolbar } from '../../components/layout/Toolbar';
import { DashboardGrid } from './components/DashboardGrid';
import { DashboardSidebar } from './components/DashboardSidebar';
import { useProjectStore, useFilteredProjects, useFeaturedProject } from '../../stores/projectStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { LoadingState } from '../../components/patterns/LoadingState';
import { ErrorState } from '../../components/patterns/ErrorState';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';

/**
 * 品牌标识组件
 */
function Brand() {
  return (
    <h1 className="text-[18px] tracking-tight">
      <span className="font-semibold text-[var(--color-text-primary)]">WRITE</span>
      <span className="font-light text-[var(--color-text-secondary)]">NOW</span>
    </h1>
  );
}

/**
 * Icon Bar 导航项配置
 */
const ICON_BAR_ITEMS: IconBarItem[] = [
  { id: 'projects', icon: <Folder />, label: 'Projects' },
  { id: 'search', icon: <Search />, label: 'Search' },
  { id: 'ai', icon: <Bot />, label: 'AI Assistant' },
  { id: 'history', icon: <Clock />, label: 'Version History' },
];

const ICON_BAR_BOTTOM_ITEMS: IconBarItem[] = [
  { id: 'settings', icon: <Settings />, label: 'Settings' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { fetchProjects, isLoading, error, createProject } = useProjectStore();
  const projects = useFilteredProjects();
  const featuredProject = useFeaturedProject();
  const { 
    activeIconBarItem, 
    setActiveIconBarItem, 
    toggleSidebar,
  } = useLayoutStore();

  // 初始加载
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /**
   * 处理创建项目
   */
  async function handleCreateProject() {
    try {
      const newProject = await createProject({
        name: 'Untitled Project',
        description: '',
      });
      // 导航到编辑器
      navigate(`/editor/${newProject.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }

  /**
   * 处理 Icon Bar 选择
   */
  function handleIconBarSelect(id: string) {
    setActiveIconBarItem(id);
    // TODO: 根据不同的 icon 显示不同的侧边栏内容
  }

  // 加载状态
  if (isLoading && projects.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--color-bg-body)]">
        <LoadingState text="Loading projects..." />
      </div>
    );
  }

  // 错误状态
  if (error && projects.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--color-bg-body)]">
        <ErrorState
          title="Failed to load projects"
          description={error}
          onRetry={() => fetchProjects()}
        />
      </div>
    );
  }

  return (
    <AppShell
      iconBar={
        <IconBar
          items={ICON_BAR_ITEMS}
          bottomItems={ICON_BAR_BOTTOM_ITEMS}
          activeId={activeIconBarItem}
          onSelect={handleIconBarSelect}
          onToggleSidebar={toggleSidebar}
        />
      }
      sidebar={
        <DashboardSidebar
          onCollapse={toggleSidebar}
          onCreateProject={handleCreateProject}
        />
      }
    >
      {/* Toolbar */}
      <div className="animate-fade-in">
        <Toolbar
          size="large"
          left={<Brand />}
          center={
            <div className="w-[300px]">
              <Input
                type="search"
                placeholder="Search projects..."
                leftSlot={<Search className="w-4 h-4" />}
              />
            </div>
          }
          right={
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleCreateProject}
              >
                New Project
              </Button>
            </div>
          }
        />
      </div>
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-12 py-8">
          <DashboardGrid
            projects={projects}
            featuredProject={featuredProject}
            onCreateProject={handleCreateProject}
            isLoading={isLoading}
          />
        </div>
      </div>
    </AppShell>
  );
}
