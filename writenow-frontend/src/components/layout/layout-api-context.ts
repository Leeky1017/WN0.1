/**
 * Layout API context
 * Why: Panels need a safe, explicit way to request cross-panel actions (open file, focus AI)
 * without relying on global singletons.
 */

import { createContext, useContext } from 'react';

export interface LayoutApi {
  openEditorTab: (filePath: string) => void;
  focusAiPanel: () => void;
  /**
   * Update the editor tab title to reflect unsaved changes.
   * Why: FlexLayout owns the tab UI; editor panels must request a tab title update via an explicit API.
   */
  setEditorTabDirty: (filePath: string, isDirty: boolean) => void;
}

export const LayoutApiContext = createContext<LayoutApi | null>(null);

export function useLayoutApi(): LayoutApi {
  const api = useContext(LayoutApiContext);
  if (!api) {
    throw new Error('LayoutApiProvider is missing in the React tree');
  }
  return api;
}
