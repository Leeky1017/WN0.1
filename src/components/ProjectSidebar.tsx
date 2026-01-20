import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FolderKanban, ListTree, Network, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useProjectsStore } from '../stores/projectsStore';
import { useFilesStore } from '../stores/filesStore';
import { useEditorStore } from '../stores/editorStore';

import type { SidebarView } from '../App';
import type { Project } from '../types/models';

interface ProjectSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

type NavItem = {
  id: SidebarView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function useCurrentProject(projects: Project[], currentProjectId: string | null) {
  return useMemo(() => {
    if (!currentProjectId) return null;
    return projects.find((p) => p.id === currentProjectId) ?? null;
  }, [currentProjectId, projects]);
}

export function ProjectSidebar({ activeView, onViewChange }: ProjectSidebarProps) {
  const { t } = useTranslation();
  const projects = useProjectsStore((s) => s.projects);
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);
  const isLoading = useProjectsStore((s) => s.isLoading);
  const hasLoaded = useProjectsStore((s) => s.hasLoaded);
  const error = useProjectsStore((s) => s.error);
  const bootstrap = useProjectsStore((s) => s.bootstrap);
  const setCurrentProject = useProjectsStore((s) => s.setCurrentProject);
  const createProject = useProjectsStore((s) => s.createProject);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  const currentProject = useCurrentProject(projects, currentProjectId);
  const [manageOpen, setManageOpen] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStyleGuide, setEditStyleGuide] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteProjectName, setDeleteProjectName] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (hasLoaded) return;
    bootstrap().catch(() => undefined);
  }, [bootstrap, hasLoaded]);

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'files', label: t('nav.files'), icon: FolderKanban },
      { id: 'characters', label: t('nav.characters'), icon: Users },
      { id: 'outline', label: t('nav.outline'), icon: ListTree },
      { id: 'knowledgeGraph', label: t('nav.knowledgeGraph'), icon: Network },
    ],
    [t]
  );

  const openManage = () => {
    setSwitchError(null);
    setCreateError(null);
    setCreateName('');
    setManageOpen(true);
    window.setTimeout(() => createInputRef.current?.focus(), 0);
  };

  const openEdit = (project: Project) => {
    setEditError(null);
    setEditProjectId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? '');
    setEditStyleGuide(project.styleGuide ?? '');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditProjectId(null);
    setEditName('');
    setEditDescription('');
    setEditStyleGuide('');
    setEditError(null);
  };

  const openDelete = (project: Project) => {
    setDeleteError(null);
    setDeleteProjectId(project.id);
    setDeleteProjectName(project.name);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteProjectId(null);
    setDeleteProjectName('');
    setDeleteError(null);
  };

  const runAfterProjectChange = async () => {
    await useFilesStore.getState().refresh();
    useEditorStore.getState().closeFile();
  };

  const switchProject = async (projectId: string) => {
    setSwitchError(null);
    const targetId = projectId.trim();
    if (!targetId || targetId === currentProjectId) return;

    const editorState = useEditorStore.getState();
    if (editorState.currentPath && editorState.isDirty) {
      try {
        await editorState.save();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setSwitchError(t('projects.switchSaveFailed', { error: message }));
        return;
      }
    }

    await setCurrentProject(targetId);
    const nextError = useProjectsStore.getState().error;
    if (nextError) {
      setSwitchError(nextError);
      return;
    }

    await runAfterProjectChange();
    setManageOpen(false);
  };

  const submitCreate = async () => {
    setCreateError(null);
    const name = createName.trim();
    if (!name) {
      setCreateError(t('projects.nameRequired'));
      return;
    }

    const created = await createProject({ name });
    if (!created) {
      setCreateError(useProjectsStore.getState().error ?? t('projects.createFailed'));
      return;
    }

    await runAfterProjectChange();
    setManageOpen(false);
  };

  const submitEdit = async () => {
    setEditError(null);
    if (!editProjectId) return;

    const name = editName.trim();
    if (!name) {
      setEditError(t('projects.nameRequired'));
      return;
    }

    const updated = await updateProject({
      id: editProjectId,
      name,
      description: editDescription.trim(),
      styleGuide: editStyleGuide.trim(),
    });

    if (!updated) {
      setEditError(useProjectsStore.getState().error ?? t('projects.updateFailed'));
      return;
    }

    closeEdit();
  };

  const submitDelete = async () => {
    setDeleteError(null);
    if (!deleteProjectId) return;

    await deleteProject(deleteProjectId);
    const nextError = useProjectsStore.getState().error;
    if (nextError) {
      setDeleteError(nextError);
      return;
    }

    await runAfterProjectChange();
    closeDelete();
    setManageOpen(false);
  };

  return (
    <>
      <div className="px-3 pt-3 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={openManage}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[13px] text-[var(--text-secondary)] transition-colors flex items-center justify-between gap-2"
            title={t('projects.manage')}
          >
            <span className="truncate">
              {currentProject?.name ?? (isLoading ? t('common.loading') : t('projects.noProject'))}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{t('projects.title')}</span>
          </button>
          <button
            type="button"
            onClick={openManage}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            title={t('projects.manage')}
          >
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {(error || switchError) && (
          <div className="mt-2 text-[12px] text-red-400">
            {switchError || error}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`h-8 px-2 rounded-md flex items-center gap-2 text-[12px] transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {manageOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={() => setManageOpen(false)}>
          <div className="wn-elevated p-5 w-[520px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">{t('projects.manage')}</div>

            <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('projects.switchHint')}</div>
            <div className="max-h-[220px] overflow-y-auto border border-[var(--border-subtle)] rounded-md">
              {projects.length === 0 && (
                <div className="px-3 py-4 text-[12px] text-[var(--text-tertiary)]">{t('projects.noProject')}</div>
              )}
              {projects.map((p) => {
                const active = p.id === currentProjectId;
                return (
                  <div
                    key={p.id}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors ${
                      active ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => switchProject(p.id).catch(() => undefined)}
                      className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left"
                      disabled={isLoading}
                    >
                      <span className="truncate">{p.name}</span>
                      {active && <span className="text-[11px] text-[var(--accent-primary)]">{t('projects.current')}</span>}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
                        title={t('projects.edit')}
                        onClick={(e) => {
                          e.preventDefault();
                          openEdit(p);
                        }}
                        disabled={isLoading}
                      >
                        <Pencil className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
                        title={t('projects.delete')}
                        onClick={(e) => {
                          e.preventDefault();
                          openDelete(p);
                        }}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 text-[var(--text-tertiary)]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {switchError && <div className="mt-2 text-[12px] text-red-400">{switchError}</div>}

            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('projects.create')}</div>
              <input
                ref={createInputRef}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreate().catch(() => undefined);
                  if (e.key === 'Escape') setManageOpen(false);
                }}
                className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                placeholder={t('projects.namePlaceholder')}
                spellCheck={false}
              />
              {createError && <div className="mt-2 text-[12px] text-red-400">{createError}</div>}

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => submitCreate().catch(() => undefined)}
                  className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                  disabled={isLoading}
                >
                  {t('common.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setManageOpen(false)}
                  className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={closeEdit}>
          <div className="wn-elevated p-5 w-[520px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">{t('projects.edit')}</div>
            <div className="space-y-3">
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('projects.nameLabel')}</div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder={t('projects.namePlaceholder')}
                  spellCheck={false}
                />
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('projects.descriptionLabel')}</div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full min-h-[72px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
                  spellCheck={false}
                />
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('projects.styleGuideLabel')}</div>
                <textarea
                  value={editStyleGuide}
                  onChange={(e) => setEditStyleGuide(e.target.value)}
                  className="w-full min-h-[72px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
                  spellCheck={false}
                />
              </div>
            </div>

            {editError && <div className="mt-2 text-[12px] text-red-400">{editError}</div>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => submitEdit().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {t('projects.update')}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={closeDelete}>
          <div className="wn-elevated p-5 w-[520px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-2">{t('projects.delete')}</div>
            <div className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
              {t('projects.deleteHint', { name: deleteProjectName })}
            </div>

            {deleteError && <div className="mt-2 text-[12px] text-red-400">{deleteError}</div>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => submitDelete().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-red-500/80 hover:bg-red-500 rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {t('projects.delete')}
              </button>
              <button
                type="button"
                onClick={closeDelete}
                className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
