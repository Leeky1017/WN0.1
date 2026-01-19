import { create } from 'zustand';

import type { DocumentFileListItem, FileCreateResult } from '../writenow';

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
  const api = window.writenow?.files;
  if (!api) throw new Error('WriteNow API is not available (are you running in Electron?)');
  return api;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function pickCreatedFile(files: DocumentFile[], created: FileCreateResult) {
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
      const files = await getFilesApi().list();
      set({ files, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error), hasLoaded: true });
    }
  },

  createFile: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const created = await getFilesApi().create(name);
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
