/**
 * ElectronApiProvider
 * Why: Inject Electron preload API into the React tree so descendants can access it via useElectronApi().
 */

import { type ReactNode, useMemo } from 'react';

import type { ElectronAPI } from '@/types/electron-api';

import { ElectronApiContext } from './electronApiContext';

function getElectronApi(): ElectronAPI | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  if (!api) return null;
  if (typeof api.platform !== 'string') return null;
  return api;
}

export interface ElectronApiProviderProps {
  children: ReactNode;
}

export function ElectronApiProvider(props: ElectronApiProviderProps) {
  const { children } = props;
  const api = useMemo(() => getElectronApi(), []);

  return <ElectronApiContext.Provider value={api}>{children}</ElectronApiContext.Provider>;
}

export default ElectronApiProvider;
