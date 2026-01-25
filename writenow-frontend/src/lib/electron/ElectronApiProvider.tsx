/**
 * ElectronApiProvider
 * Why: Export only a React component to satisfy react-refresh boundary lint rules.
 */

import type { ReactNode } from 'react';

import type { ElectronAPI } from '@/types/electron-api';

import { ElectronApiContext } from './electronApiContext';

export interface ElectronApiProviderProps {
  api: ElectronAPI | null;
  children: ReactNode;
}

export function ElectronApiProvider({ api, children }: ElectronApiProviderProps) {
  return <ElectronApiContext.Provider value={api}>{children}</ElectronApiContext.Provider>;
}

export default ElectronApiProvider;

