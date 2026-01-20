import { create } from 'zustand';

import { IpcError, projectOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

import type { Project } from '../types/models';

type ProjectDraft = {
  name: string;
  description?: string;
  styleGuide?: string;
};

type ProjectPatch = {
  id: string;
  name?: string;
  description?: string;
  styleGuide?: string;
};

type ProjectsState = {
  projects: Project[];
  currentProjectId: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  setCurrentProject: (projectId: string) => Promise<void>;
  createProject: (draft: ProjectDraft) => Promise<Project | null>;
  updateProject: (patch: ProjectPatch) => Promise<Project | null>;
  deleteProject: (id: string, options?: { reassignProjectId?: string }) => Promise<void>;
};

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,
  hasLoaded: false,
  error: null,

  bootstrap: async () => {
    set({ isLoading: true, error: null });
    try {
      await projectOps.bootstrap();
      const [{ projects }, { projectId }] = await Promise.all([projectOps.list(), projectOps.getCurrent()]);
      set({
        projects,
        currentProjectId: projectId ?? null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: toErrorMessage(error),
      });
    }
  },

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const [{ projects }, { projectId }] = await Promise.all([projectOps.list(), projectOps.getCurrent()]);
      set({
        projects,
        currentProjectId: projectId ?? null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: toErrorMessage(error),
      });
    }
  },

  setCurrentProject: async (projectId: string) => {
    const nextId = typeof projectId === 'string' ? projectId.trim() : '';
    if (!nextId) return;

    set({ isLoading: true, error: null });
    try {
      await projectOps.setCurrent(nextId);
      const [{ projects }, { projectId: refreshedId }] = await Promise.all([projectOps.list(), projectOps.getCurrent()]);
      set({
        projects,
        currentProjectId: refreshedId ?? nextId,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  createProject: async (draft: ProjectDraft) => {
    set({ isLoading: true, error: null });
    try {
      const created = await projectOps.create(draft);
      const [{ projects }, { projectId }] = await Promise.all([projectOps.list(), projectOps.getCurrent()]);
      set({
        projects,
        currentProjectId: projectId ?? created.currentProjectId,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
      return created.project;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  updateProject: async (patch: ProjectPatch) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await projectOps.update(patch);
      const [{ projects }, { projectId }] = await Promise.all([projectOps.list(), projectOps.getCurrent()]);
      set({
        projects,
        currentProjectId: projectId ?? get().currentProjectId,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
      return updated.project;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  deleteProject: async (id: string, options?: { reassignProjectId?: string }) => {
    set({ isLoading: true, error: null });
    try {
      await projectOps.delete({ id, reassignProjectId: options?.reassignProjectId });
      const [{ projects }, { projectId }] = await Promise.all([projectOps.list(), projectOps.getCurrent()]);
      set({
        projects,
        currentProjectId: projectId ?? null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },
}));

