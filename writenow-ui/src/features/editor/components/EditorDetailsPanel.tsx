/**
 * EditorDetailsPanel Component
 * 
 * 编辑器右侧详情面板，显示封面、标签、字数、阅读时间等信息。
 * 
 * @see DESIGN_SPEC.md 7.3 Editor 页面
 * @see DESIGN_SPEC.md 4.5 Panel
 */
import { Image, Tag, FileText, Clock, Calendar, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Panel } from '../../../components/layout/Panel';
import { Badge } from '../../../components/primitives/Badge';
import { Divider } from '../../../components/primitives/Divider';
import { useEditorStore } from '../../../stores/editorStore';
import type { Project } from '../../../stores/projectStore';

export interface EditorDetailsPanelProps {
  /** 当前项目 */
  project: Project | null;
  /** 折叠回调 */
  onCollapse?: () => void;
}

/**
 * 详情行组件
 */
function DetailRow({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center justify-between py-2', className)}>
      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
        <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        <span className="text-[13px]">{label}</span>
      </div>
      <div className="text-[13px] text-[var(--color-text-secondary)]">{value}</div>
    </div>
  );
}

/**
 * 封面图占位
 */
function CoverPlaceholder({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full aspect-[16/9] rounded-lg',
        'border border-dashed border-[var(--color-border-default)]',
        'flex flex-col items-center justify-center gap-2',
        'text-[var(--color-text-tertiary)]',
        'hover:border-[var(--color-border-hover)]',
        'hover:text-[var(--color-text-secondary)]',
        'transition-colors'
      )}
    >
      <Image className="w-6 h-6" strokeWidth={1.5} />
      <span className="text-[12px]">Add cover image</span>
    </button>
  );
}

/**
 * 封面图显示
 */
function CoverImage({ src, alt }: { src: string; alt?: string }) {
  return (
    <div className="w-full aspect-[16/9] rounded-lg overflow-hidden relative group">
      <img
        src={src}
        alt={alt || 'Cover image'}
        className="w-full h-full object-cover opacity-60 grayscale"
      />
      <div
        className={clsx(
          'absolute inset-0 flex items-center justify-center',
          'bg-black/50 opacity-0 group-hover:opacity-100',
          'transition-opacity'
        )}
      >
        <span className="text-[12px] text-white">Change cover</span>
      </div>
    </div>
  );
}

/**
 * 标签列表
 */
function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return (
      <button
        type="button"
        className={clsx(
          'text-[12px] text-[var(--color-text-tertiary)]',
          'hover:text-[var(--color-text-secondary)]',
          'transition-colors'
        )}
      >
        + Add tags
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag} variant="default">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

/**
 * 格式化日期
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

export function EditorDetailsPanel({ project, onCollapse }: EditorDetailsPanelProps) {
  const { meta } = useEditorStore();

  return (
    <Panel
      title="Details"
      onCollapse={onCollapse}
    >
      <div className="space-y-6">
        {/* Cover Image Section */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-[#666666] mb-3">
            Cover
          </h3>
          {project?.coverImage ? (
            <CoverImage src={project.coverImage} alt={project.name} />
          ) : (
            <CoverPlaceholder />
          )}
        </section>

        <Divider />

        {/* Tags Section */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-[#666666] mb-3">
            Tags
          </h3>
          <TagList tags={project?.tags || []} />
        </section>

        <Divider />

        {/* Statistics Section */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-[#666666] mb-2">
            Statistics
          </h3>
          <div className="space-y-0.5">
            <DetailRow
              icon={<FileText />}
              label="Words"
              value={formatNumber(meta.wordCount)}
            />
            <DetailRow
              icon={<Tag />}
              label="Characters"
              value={formatNumber(meta.charCount)}
            />
            <DetailRow
              icon={<Clock />}
              label="Reading time"
              value={`${meta.readTime} min`}
            />
          </div>
        </section>

        <Divider />

        {/* Dates Section */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-[#666666] mb-2">
            Dates
          </h3>
          <div className="space-y-0.5">
            <DetailRow
              icon={<Calendar />}
              label="Created"
              value={formatDate(project?.createdAt)}
            />
            <DetailRow
              icon={<Calendar />}
              label="Modified"
              value={formatDate(meta.lastModified || project?.updatedAt)}
            />
          </div>
        </section>

        <Divider />

        {/* Quick Actions */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.1em] text-[#666666] mb-2">
            Actions
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              className={clsx(
                'w-full flex items-center justify-between',
                'py-2 px-2 -mx-2 rounded',
                'text-[13px] text-[var(--color-text-secondary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors'
              )}
            >
              <span>Version history</span>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
            <button
              type="button"
              className={clsx(
                'w-full flex items-center justify-between',
                'py-2 px-2 -mx-2 rounded',
                'text-[13px] text-[var(--color-text-secondary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors'
              )}
            >
              <span>Export options</span>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
            <button
              type="button"
              className={clsx(
                'w-full flex items-center justify-between',
                'py-2 px-2 -mx-2 rounded',
                'text-[13px] text-[var(--color-text-secondary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors'
              )}
            >
              <span>Project settings</span>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </section>
      </div>
    </Panel>
  );
}

EditorDetailsPanel.displayName = 'EditorDetailsPanel';
