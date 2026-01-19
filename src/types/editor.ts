export type EditorMode = 'markdown' | 'richtext';

export type SaveStatus = 'saved' | 'saving' | 'error';

export type EditorDocument = {
  path: string;
  content: string;
  mode: EditorMode;
};

export type EditorState = {
  currentPath: string | null;
  content: string;
  isDirty: boolean;
  isLoading: boolean;
  loadError: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
};

