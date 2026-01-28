/**
 * ProjectSwitcher - Project selection dropdown
 * Why: Allow users to quickly switch between projects.
 */

import { useCallback, useState } from 'react';
import { Check, ChevronDown, FolderOpen, Plus, Settings } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Project } from '@/types/ipc-generated';

import { useProjects } from './useProjects';

interface ProjectSwitcherProps {
  onOpenSettings?: () => void;
  onCreateNew?: () => void;
}

export function ProjectSwitcher({ onOpenSettings, onCreateNew }: ProjectSwitcherProps) {
  const { projects, currentProject, currentProjectId, loading, setCurrentProject } = useProjects();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleSelect = useCallback(
    async (project: Project) => {
      if (project.id === currentProjectId) {
        setOpen(false);
        return;
      }
      setSwitching(true);
      await setCurrentProject(project.id);
      setSwitching(false);
      setOpen(false);
    },
    [currentProjectId, setCurrentProject],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-[12px] font-medium text-[var(--fg-default)] max-w-[180px]"
          disabled={loading || switching}
        >
          <FolderOpen size={14} className="text-[var(--accent-default)] shrink-0" />
          <span className="truncate">{currentProject?.name ?? '选择项目'}</span>
          <ChevronDown size={12} className="text-[var(--fg-subtle)] shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          {projects.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-[var(--fg-muted)]">
              {loading ? '正在加载…' : '暂无项目'}
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left"
                onClick={() => void handleSelect(project)}
                disabled={switching}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[var(--fg-default)] truncate">
                    {project.name}
                  </div>
                  {project.description && (
                    <div className="text-[10px] text-[var(--fg-muted)] truncate">
                      {project.description}
                    </div>
                  )}
                </div>
                {project.id === currentProjectId && (
                  <Check size={14} className="text-[var(--accent-default)] shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
          {onCreateNew && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left text-[12px] text-[var(--fg-muted)]"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
            >
              <Plus size={14} />
              新建项目
            </button>
          )}
          {onOpenSettings && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left text-[12px] text-[var(--fg-muted)]"
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
            >
              <Settings size={14} />
              项目设置
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ProjectSwitcher;
