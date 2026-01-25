import { createContext, useContext } from 'react';

import type { FileNode } from './types';

export type FileTreeContextValue = {
  openContextMenu: (node: FileNode, position: { x: number; y: number }) => void;
};

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

/**
 * Why: react-arborist's Tree `onContextMenu` handler is DOM-event-only, so we pass node-aware actions through a
 * dedicated context and let the NodeRenderer open the menu for the correct target.
 */
export function useFileTreeContext(): FileTreeContextValue {
  const ctx = useContext(FileTreeContext);
  if (!ctx) {
    throw new Error('useFileTreeContext must be used within FileTreeContext provider');
  }
  return ctx;
}

export const FileTreeContextProvider = FileTreeContext.Provider;

