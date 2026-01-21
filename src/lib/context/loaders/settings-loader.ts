import type { ContextFragmentInput } from '../../../types/context';
import type {
  ContextWritenowSettingsListResponse,
  ContextWritenowSettingsReadResponse,
  WritenowLoaderError,
  WritenowSettingsFile,
} from '../../../types/ipc';

import { invoke } from '../../ipc';
import { joinWritenowPath } from '../writenow-paths';

export type WritenowSettingsIndex = {
  projectId: string;
  rootPath: string;
  loadedAtMs: number | null;
  characters: string[];
  settings: string[];
  errors: WritenowLoaderError[];
};

export async function listWritenowSettings(projectId: string, options?: { refresh?: boolean }): Promise<WritenowSettingsIndex> {
  const res: ContextWritenowSettingsListResponse = await invoke('context:writenow:settings:list', {
    projectId,
    ...(options?.refresh ? { refresh: true } : {}),
  });

  return {
    projectId: res.projectId,
    rootPath: res.rootPath,
    loadedAtMs: res.loadedAtMs,
    characters: res.characters,
    settings: res.settings,
    errors: res.errors,
  };
}

export type LoadedSettings = {
  projectId: string;
  rootPath: string;
  fragments: ContextFragmentInput[];
  errors: WritenowLoaderError[];
};

function getSettingsPriority(relPath: string): number {
  if (relPath.startsWith('characters/')) return 80;
  if (relPath.startsWith('settings/')) return 70;
  return 60;
}

function toFragment(file: WritenowSettingsFile): ContextFragmentInput {
  const pathInWritenow = joinWritenowPath(file.path);
  return {
    id: `settings:${file.path}`,
    layer: 'settings',
    source: { kind: 'file', path: pathInWritenow },
    content: file.content,
    priority: getSettingsPriority(file.path),
    meta: { updatedAtMs: file.updatedAtMs },
  };
}

export async function loadWritenowSettings(
  projectId: string,
  input: {
    characters?: string[];
    settings?: string[];
  },
): Promise<LoadedSettings> {
  const res: ContextWritenowSettingsReadResponse = await invoke('context:writenow:settings:read', {
    projectId,
    ...(Array.isArray(input.characters) ? { characters: input.characters } : {}),
    ...(Array.isArray(input.settings) ? { settings: input.settings } : {}),
  });

  return {
    projectId: res.projectId,
    rootPath: res.rootPath,
    fragments: res.files.map(toFragment),
    errors: res.errors,
  };
}

export type SettingsLoaderError = WritenowLoaderError;

