/**
 * ProjectCard Component
 * 
 * 项目卡片组件，显示封面/标题/摘要/日期/标签。
 * 固定高度 240px，用于 Dashboard 网格布局。
 * 
 * @see DESIGN_SPEC.md 6.1 ProjectCard
 */
import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Badge } from '../../../components/primitives/Badge';
import { Clock, FileText } from 'lucide-react';
import type { Project } from '../../../stores/projectStore';

export interface ProjectCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 项目数据 */
  project: Project;
  /** 点击回调 */
  onProjectClick?: (project: Project) => void;
}

/**
 * 格式化日期为相对时间
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * 格式化阅读时间
 */
function formatReadTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

export const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ project, onProjectClick, className, ...props }, ref) => {
    const { name, description, updatedAt, status, tags, wordCount, readTime } = project;

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={() => onProjectClick?.(project)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onProjectClick?.(project);
          }
        }}
        className={clsx(
          // 基础样式
          'h-[240px]',
          'rounded-[24px]',
          'border border-[var(--color-border-default)]',
          'bg-[var(--color-bg-surface)]',
          'cursor-pointer',
          'transition-all duration-[300ms]',
          'flex flex-col',
          'overflow-hidden',
          
          // 悬停状态
          'hover:border-[var(--color-border-active)]',
          'hover:bg-[var(--color-bg-hover)]',
          
          // 聚焦状态
          'focus:outline-none',
          'focus:border-[var(--color-border-active)]',
          
          className,
        )}
        {...props}
      >
        {/* 内容区 */}
        <div className="flex-1 p-6 flex flex-col">
          {/* 顶部：日期和状态 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              {formatRelativeDate(updatedAt)}
            </span>
            {status !== 'draft' && (
              <Badge variant={status === 'published' ? 'success' : 'default'}>
                {status}
              </Badge>
            )}
          </div>
          
          {/* 标题 */}
          <h3 className="text-[18px] font-medium text-[var(--color-text-primary)] mb-2 line-clamp-2">
            {name}
          </h3>
          
          {/* 摘要 */}
          {description && (
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 flex-1">
              {description}
            </p>
          )}
        </div>
        
        {/* 底部：标签和统计 */}
        <div className="px-6 py-4 border-t border-[var(--color-border-default)] flex items-center justify-between">
          {/* 标签 */}
          <div className="flex items-center gap-2 overflow-hidden">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                +{tags.length - 2}
              </span>
            )}
          </div>
          
          {/* 统计 */}
          <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatReadTime(readTime)}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ProjectCard.displayName = 'ProjectCard';
