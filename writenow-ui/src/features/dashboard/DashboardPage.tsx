/**
 * DashboardPage
 * 
 * 仪表盘页面，展示项目列表。
 * 当前为简化版本，后续集成 AppShell 三栏布局。
 * 
 * @see DESIGN_SPEC.md 7.2 Dashboard 页面
 */
import { useEffect } from 'react';
import { DashboardGrid } from './components/DashboardGrid';
import { useProjectStore, useFilteredProjects, useFeaturedProject } from '../../stores/projectStore';
import { LoadingState } from '../../components/patterns/LoadingState';
import { ErrorState } from '../../components/patterns/ErrorState';
import { Search, Plus } from 'lucide-react';
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

export function DashboardPage() {
  const { fetchProjects, isLoading, error, createProject } = useProjectStore();
  const projects = useFilteredProjects();
  const featuredProject = useFeaturedProject();

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
      // TODO: 导航到编辑器
      console.log('Created project:', newProject.id);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
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
    <div className="w-screen h-screen flex flex-col bg-[var(--color-bg-body)]">
      {/* Toolbar */}
      <header className="h-20 px-12 flex items-center justify-between border-b border-[var(--color-border-default)] shrink-0">
        {/* 左侧 - Brand */}
        <Brand />
        
        {/* 中间 - 搜索框 */}
        <div className="w-[300px]">
          <Input
            type="search"
            placeholder="Search projects..."
            leftSlot={<Search className="w-4 h-4" />}
          />
        </div>
        
        {/* 右侧 - 操作按钮 */}
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
      </header>
      
      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-12 py-8">
          <DashboardGrid
            projects={projects}
            featuredProject={featuredProject}
            onCreateProject={handleCreateProject}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
}
