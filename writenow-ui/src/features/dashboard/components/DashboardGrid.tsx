/**
 * DashboardGrid Component
 * 
 * Dashboard 项目网格布局，Bento Grid 风格。
 * 包含 HeroCard (featured) + ProjectCard 网格。
 * 
 * @see DESIGN_SPEC.md 7.2 Dashboard 页面
 */
import { useNavigate } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';
import { HeroCard } from './HeroCard';
import { EmptyState } from '../../../components/patterns/EmptyState';
import { Plus, FolderOpen } from 'lucide-react';
import type { Project } from '../../../stores/projectStore';

export interface DashboardGridProps {
  /** 项目列表 */
  projects: Project[];
  /** 特色项目 */
  featuredProject?: Project;
  /** 创建新项目回调 */
  onCreateProject?: () => void;
  /** 加载状态 */
  isLoading?: boolean;
}

export function DashboardGrid({
  projects,
  featuredProject,
  onCreateProject,
  isLoading = false,
}: DashboardGridProps) {
  const navigate = useNavigate();

  /**
   * 处理项目点击
   */
  function handleProjectClick(project: Project) {
    navigate(`/editor/${project.id}`);
  }

  // 过滤掉 featured 项目，避免重复显示
  const regularProjects = projects.filter((p) => p.id !== featuredProject?.id);

  // 空状态
  if (!isLoading && projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={<FolderOpen className="w-12 h-12" />}
          title="No projects yet"
          description="Create your first project to start writing. Your stories are waiting to be told."
          action={{
            label: 'Create Project',
            onClick: () => onCreateProject?.(),
            variant: 'primary',
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Featured Project - HeroCard */}
      {featuredProject && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Continue Writing
            </h2>
          </div>
          <HeroCard
            project={featuredProject}
            onContinue={handleProjectClick}
          />
        </section>
      )}

      {/* 项目网格 */}
      {regularProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
              All Projects
            </h2>
            <span className="text-[12px] text-[var(--color-text-tertiary)]">
              {regularProjects.length} {regularProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          
          {/* Bento Grid - 自适应列数 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {regularProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onProjectClick={handleProjectClick}
              />
            ))}
            
            {/* 新建项目卡片 */}
            <button
              onClick={onCreateProject}
              className="
                h-[240px]
                rounded-[24px]
                border border-dashed border-[var(--color-border-default)]
                bg-transparent
                cursor-pointer
                transition-all duration-[300ms]
                flex flex-col items-center justify-center gap-4
                hover:border-[var(--color-border-hover)]
                hover:bg-[var(--color-bg-hover)]
                focus:outline-none
                focus:border-[var(--color-border-focus)]
              "
            >
              <div className="w-12 h-12 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center">
                <Plus className="w-6 h-6 text-[var(--color-text-secondary)]" />
              </div>
              <span className="text-[14px] text-[var(--color-text-secondary)]">
                New Project
              </span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
