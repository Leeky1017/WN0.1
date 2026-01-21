import type { WritenowLoaderError } from '../../types/ipc';

import { invoke } from '../ipc';

export type WritenowWatchState = {
  projectId: string;
  watching: boolean;
  atMs: number;
};

export type WritenowChangedEvent = {
  projectId: string;
  changedPaths: string[];
  atMs: number;
};

export function onWritenowChanged(callback: (evt: WritenowChangedEvent) => void) {
  const wrapped = (...args: unknown[]) => {
    const first = args[0] as WritenowChangedEvent | undefined;
    if (!first || typeof first !== 'object') return;
    callback(first);
  };

  window.writenow.on('context:writenow:changed', wrapped);
  return () => window.writenow.off('context:writenow:changed', wrapped);
}

export function onWritenowWatch(callback: (evt: WritenowWatchState) => void) {
  const wrapped = (...args: unknown[]) => {
    const first = args[0] as WritenowWatchState | undefined;
    if (!first || typeof first !== 'object') return;
    callback(first);
  };

  window.writenow.on('context:writenow:watch', wrapped);
  return () => window.writenow.off('context:writenow:watch', wrapped);
}

export async function ensureWritenow(projectId: string) {
  return invoke('context:writenow:ensure', { projectId });
}

export async function getWritenowStatus(projectId: string) {
  return invoke('context:writenow:status', { projectId });
}

export async function startWritenowWatch(projectId: string) {
  return invoke('context:writenow:watch:start', { projectId });
}

export async function stopWritenowWatch(projectId: string) {
  return invoke('context:writenow:watch:stop', { projectId });
}

export type LoaderError = WritenowLoaderError;

