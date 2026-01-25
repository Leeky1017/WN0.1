/**
 * ElectronApiContext
 * Why: Hold the optional Electron preload API in a React context so feature code can depend on it explicitly.
 */

import { createContext } from 'react';

import type { ElectronAPI } from '@/types/electron-api';

export const ElectronApiContext = createContext<ElectronAPI | null>(null);

