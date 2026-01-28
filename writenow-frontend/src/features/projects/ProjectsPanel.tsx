/**
 * ProjectsPanel - Full project management UI
 * Why: Allow users to create, edit, delete, and manage projects.
 */

import { useCallback, useState } from 'react';
import { Plus, Trash2, Edit3, RefreshCw, AlertCircle, FolderCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/types/ipc-generated';

import { useProjects } from './useProjects';

interface ProjectItemProps {
  project: Project;
  isCurrent: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProjectItem({ project, isCurrent, onSelect, onEdit, onDelete }: ProjectItemProps) {
  const createdAt = new Date(project.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`group px-3 py-2 rounded-md transition-colors cursor-pointer ${
        isCurrent ? 'bg-[var(--accent-default)]/10' : 'hover:bg-[var(--bg-hover)]'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-default)] truncate">
              {project.name}
            </span>
            {isCurrent && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-default)]/20 text-[var(--accent-default)] font-medium">
                当前
              </span>
            )}
          </div>
          {project.description && (
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)] line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="mt-1 text-[10px] text-[var(--fg-subtle)]">
            创建于 {createdAt}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            icon={Edit3}
            size="xs"
            variant="ghost"
            tooltip="编辑"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          />
          <IconButton
            icon={Trash2}
            size="xs"
            variant="ghost"
            tooltip="删除"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface ProjectFormProps {
  initial?: Project | null;
  onSubmit: (name: string, description?: string, styleGuide?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function ProjectForm({ initial, onSubmit, onCancel, loading }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [styleGuide, setStyleGuide] = useState(initial?.styleGuide ?? '');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      await onSubmit(
        name.trim(),
        description.trim() || undefined,
        styleGuide.trim() || undefined,
      );
    },
    [name, description, styleGuide, onSubmit],
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="p-3 space-y-3 border-b border-[var(--border-subtle)]">
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--fg-muted)]">项目名称 *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="我的项目"
          inputSize="sm"
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-[var(--fg-muted)]">描述</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="项目简介（可选）"
          inputSize="sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-[var(--fg-muted)]">写作风格指南</label>
        <Textarea
          value={styleGuide}
          onChange={(e) => setStyleGuide(e.target.value)}
          placeholder="描述你期望的写作风格（可选）"
          className="min-h-[60px] text-[12px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={loading} disabled={!name.trim()}>
          {initial ? '保存' : '创建'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          取消
        </Button>
      </div>
    </form>
  );
}

export function ProjectsPanel() {
  const projectsHook = useProjects();

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (name: string, description?: string, styleGuide?: string) => {
      setFormLoading(true);
      const result = await projectsHook.create(name, description, styleGuide);
      setFormLoading(false);
      if (result) {
        setShowForm(false);
      }
    },
    [projectsHook],
  );

  const handleEdit = useCallback(
    async (name: string, description?: string, styleGuide?: string) => {
      if (!editingProject) return;
      setFormLoading(true);
      const result = await projectsHook.update(editingProject.id, { name, description, styleGuide });
      setFormLoading(false);
      if (result) {
        setEditingProject(null);
      }
    },
    [editingProject, projectsHook],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (deleteConfirmId !== id) {
        setDeleteConfirmId(id);
        return;
      }
      // Find another project to reassign if deleting current
      const otherProject = projectsHook.projects.find((p) => p.id !== id);
      await projectsHook.remove(id, otherProject?.id);
      setDeleteConfirmId(null);
    },
    [deleteConfirmId, projectsHook],
  );

  const handleSelect = useCallback(
    async (project: Project) => {
      if (project.id === projectsHook.currentProjectId) return;
      await projectsHook.setCurrentProject(project.id);
    },
    [projectsHook],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderCog size={14} className="text-[var(--accent-default)]" />
          <span className="text-[11px] font-medium text-[var(--fg-default)]">
            {projectsHook.projects.length} 个项目
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={RefreshCw}
            size="xs"
            variant="ghost"
            tooltip="刷新"
            onClick={() => void projectsHook.refresh()}
            disabled={projectsHook.loading}
          />
          <IconButton
            icon={Plus}
            size="xs"
            variant="ghost"
            tooltip="新建项目"
            onClick={() => setShowForm(true)}
            disabled={showForm || !!editingProject}
          />
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={formLoading} />
      )}

      {/* Edit Form */}
      {editingProject && (
        <ProjectForm
          initial={editingProject}
          onSubmit={handleEdit}
          onCancel={() => setEditingProject(null)}
          loading={formLoading}
        />
      )}

      {/* Error */}
      {projectsHook.error && (
        <div className="px-3 py-2 text-[11px] text-[var(--error)] border-b border-[var(--error)]/40 bg-[var(--error)]/5 flex items-start gap-2">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          {projectsHook.error}
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {projectsHook.loading && projectsHook.projects.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--fg-muted)]">正在加载…</div>
        ) : projectsHook.projects.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-[11px] text-[var(--fg-muted)]">暂无项目</div>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={() => void projectsHook.bootstrap()}
            >
              初始化默认项目
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {projectsHook.projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isCurrent={project.id === projectsHook.currentProjectId}
                onSelect={() => void handleSelect(project)}
                onEdit={() => setEditingProject(project)}
                onDelete={() => void handleDelete(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="shrink-0 px-3 py-2 bg-[var(--error)]/10 border-t border-[var(--error)]/30">
          <div className="text-[11px] text-[var(--error)] mb-2">
            确定要删除此项目吗？项目下的文档将被移动到其他项目。
          </div>
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={() => void handleDelete(deleteConfirmId)}>
              确认删除
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPanel;
