import { create } from 'zustand';

import type { DocumentFileListItem, FileCreateResponse } from '../types/ipc';
import { IpcError, fileOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

export type DocumentFile = DocumentFileListItem;

type FilesState = {
  files: DocumentFile[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createFile: (name: string) => Promise<DocumentFile | null>;
  deleteFile: (path: string) => Promise<void>;
};

function getFilesApi() {
  return fileOps;
}

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function pickCreatedFile(files: DocumentFile[], created: FileCreateResponse) {
  return files.find((f) => f.path === created.path) ?? null;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: [],
  isLoading: false,
  hasLoaded: false,
  error: null,

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const projectId = useProjectsStore.getState().currentProjectId;
      const { items } = await getFilesApi().list(projectId ? { projectId } : undefined);
      set({ files: items, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error), hasLoaded: true });
    }
  },

  createFile: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const projectId = useProjectsStore.getState().currentProjectId;
      const created = await getFilesApi().create(name, projectId ? { projectId } : undefined);
      await get().refresh();
      return pickCreatedFile(get().files, created);
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      return null;
    }
  },

  deleteFile: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      await getFilesApi().delete(path);
      await get().refresh();
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
    }
  },
}));
