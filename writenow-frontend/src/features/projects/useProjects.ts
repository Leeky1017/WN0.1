/**
 * useProjects hook
 * Why: Centralize project management operations with proper loading/error states.
 */

import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@/lib/rpc';
import type { Project } from '@/types/ipc-generated';

export interface UseProjectsResult {
  projects: Project[];
  currentProjectId: string | null;
  currentProject: Project | null;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setCurrentProject: (id: string) => Promise<boolean>;
  create: (name: string, description?: string, styleGuide?: string) => Promise<Project | null>;
  update: (id: string, patch: { name?: string; description?: string; styleGuide?: string }) => Promise<Project | null>;
  remove: (id: string, reassignProjectId?: string) => Promise<boolean>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, currentRes] = await Promise.all([
        invoke('project:list', {}),
        invoke('project:getCurrent', {}),
      ]);
      setProjects(listRes.projects);
      setCurrentProjectIdState(currentRes.projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      setProjects([]);
      setCurrentProjectIdState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setError(null);
    try {
      const res = await invoke('project:bootstrap', {});
      setCurrentProjectIdState(res.currentProjectId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bootstrap project');
    }
  }, [refresh]);

  const setCurrentProject = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await invoke('project:setCurrent', { projectId: id });
      setCurrentProjectIdState(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set current project');
      return false;
    }
  }, []);

  const create = useCallback(async (
    name: string,
    description?: string,
    styleGuide?: string,
  ): Promise<Project | null> => {
    setError(null);
    try {
      const res = await invoke('project:create', { name, description, styleGuide });
      setProjects((prev) => [res.project, ...prev]);
      setCurrentProjectIdState(res.currentProjectId);
      return res.project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return null;
    }
  }, []);

  const update = useCallback(async (
    id: string,
    patch: { name?: string; description?: string; styleGuide?: string },
  ): Promise<Project | null> => {
    setError(null);
    try {
      const res = await invoke('project:update', { id, ...patch });
      setProjects((prev) => prev.map((p) => (p.id === id ? res.project : p)));
      return res.project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string, reassignProjectId?: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await invoke('project:delete', { id, reassignProjectId });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setCurrentProjectIdState(res.currentProjectId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      return false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  return {
    projects,
    currentProjectId,
    currentProject,
    loading,
    error,
    refresh,
    bootstrap,
    setCurrentProject,
    create,
    update,
    remove,
  };
}

export default useProjects;
