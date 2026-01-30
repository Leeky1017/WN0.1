/**
 * HeroCard Component
 * 
 * 特色项目大卡片，用于展示 featured 项目。
 * 最小高度 320px，横向布局：内容区 60% + 图片区 40%。
 * 
 * @see DESIGN_SPEC.md 6.2 HeroCard
 */
import { forwardRef, type HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Button } from '../../../components/primitives/Button';
import { Badge } from '../../../components/primitives/Badge';
import { ArrowRight, Clock, FileText } from 'lucide-react';
import type { Project } from '../../../stores/projectStore';

export interface HeroCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 项目数据 */
  project: Project;
  /** 点击"Continue Writing"回调 */
  onContinue?: (project: Project) => void;
}

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * 格式化阅读时间
 */
function formatReadTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min read`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m read` : `${hours}h read`;
}

export const HeroCard = forwardRef<HTMLDivElement, HeroCardProps>(
  ({ project, onContinue, className, ...props }, ref) => {
    const { name, description, updatedAt, status, tags, wordCount, readTime, coverImage } = project;

    return (
      <div
        ref={ref}
        className={clsx(
          // 基础样式
          'min-h-[320px]',
          'rounded-[24px]',
          'border border-[var(--color-border-default)]',
          'bg-[var(--color-bg-surface)]',
          'overflow-hidden',
          'transition-all duration-[300ms]',
          'flex',
          
          // 悬停状态
          'hover:border-[var(--color-border-active)]',
          
          className,
        )}
        {...props}
      >
        {/* 内容区 - 60% */}
        <div className="w-[60%] p-10 flex flex-col justify-between">
          {/* 顶部 */}
          <div>
            {/* 标签和日期 */}
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="default">FEATURED</Badge>
              {status === 'published' && (
                <Badge variant="success">{status}</Badge>
              )}
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                Last edited {formatDate(updatedAt)}
              </span>
            </div>
            
            {/* 标题 */}
            <h2 className="text-[32px] font-medium text-[var(--color-text-primary)] mb-4 leading-tight">
              {name}
            </h2>
            
            {/* 描述 */}
            {description && (
              <p className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed max-w-[500px] line-clamp-3">
                {description}
              </p>
            )}
          </div>
          
          {/* 底部 */}
          <div className="flex items-center justify-between mt-8">
            {/* 统计信息 */}
            <div className="flex items-center gap-6 text-[13px] text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {wordCount.toLocaleString()} words
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatReadTime(readTime)}
              </span>
            </div>
            
            {/* 操作按钮 */}
            <Button
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onContinue?.(project)}
            >
              Continue Writing
            </Button>
          </div>
          
          {/* 标签列表 */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 mt-6">
              {tags.map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* 图片区 - 40% */}
        <div className="w-[40%] relative bg-[var(--color-bg-hover)]">
          {coverImage ? (
            <img
              src={coverImage}
              alt={name}
              className={clsx(
                'absolute inset-0 w-full h-full object-cover',
                'opacity-40 grayscale',
                'transition-opacity duration-[300ms]',
                'group-hover:opacity-60',
              )}
            />
          ) : (
            // 占位图案
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[var(--color-text-tertiary)]">
                <FileText className="w-24 h-24 opacity-20" />
              </div>
            </div>
          )}
          
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-surface)] via-transparent to-transparent w-1/3" />
        </div>
      </div>
    );
  }
);

HeroCard.displayName = 'HeroCard';
