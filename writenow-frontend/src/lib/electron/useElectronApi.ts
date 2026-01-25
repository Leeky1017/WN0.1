/**
 * useElectronApi
 * Why: Consume Electron preload APIs via explicit context instead of reaching into `window` inside feature code.
 */

import { useContext } from 'react';

import type { ElectronAPI } from '@/types/electron-api';

import { ElectronApiContext } from './electronApiContext';

export function useElectronApi(): ElectronAPI | null {
  return useContext(ElectronApiContext);
}

export default useElectronApi;

