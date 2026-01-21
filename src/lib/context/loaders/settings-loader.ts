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

export type PrefetchResolvedSettings = {
  characters: string[];
  settings: string[];
};

export type PrefetchByEntitiesResult = {
  projectId: string;
  rootPath: string;
  loadedAtMs: number;
  entities: string[];
  resolved: PrefetchResolvedSettings;
  fragments: ContextFragmentInput[];
  errors: WritenowLoaderError[];
};

type PrefetchCacheEntry = {
  result: PrefetchByEntitiesResult;
};

const settingsIndexCache = new Map<string, WritenowSettingsIndex>();
const prefetchCache = new Map<string, PrefetchCacheEntry>();

function stripMdExt(fileName: string): string {
  const raw = typeof fileName === 'string' ? fileName.trim() : '';
  if (!raw) return '';
  return raw.replace(/\.md$/i, '');
}

function normalizeKey(value: string): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function uniqSorted(list: string[]): string[] {
  return Array.from(new Set(list.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

async function getSettingsIndexCached(projectId: string, options?: { refresh?: boolean }): Promise<WritenowSettingsIndex> {
  const key = normalizeKey(projectId);
  if (!key) throw new Error('projectId is required');
  if (!options?.refresh) {
    const cached = settingsIndexCache.get(key);
    if (cached) return cached;
  }
  const index = await listWritenowSettings(projectId, options);
  settingsIndexCache.set(key, index);
  return index;
}

function resolveEntitiesToFiles(index: WritenowSettingsIndex, entities: string[]): PrefetchResolvedSettings {
  const entityKeys = uniqSorted(entities.map((e) => stripMdExt(e)));
  const charactersByKey = new Map(index.characters.map((name) => [normalizeKey(stripMdExt(name)), name] as const));
  const settingsByKey = new Map(index.settings.map((name) => [normalizeKey(stripMdExt(name)), name] as const));

  const characters: string[] = [];
  const settings: string[] = [];

  for (const entity of entityKeys) {
    const key = normalizeKey(entity);
    if (!key) continue;
    const c = charactersByKey.get(key);
    if (c) characters.push(c);
    const s = settingsByKey.get(key);
    if (s) settings.push(s);
  }

  return { characters: uniqSorted(characters), settings: uniqSorted(settings) };
}

export function getPrefetchedSettings(projectId: string): PrefetchByEntitiesResult | null {
  const key = normalizeKey(projectId);
  if (!key) return null;
  return prefetchCache.get(key)?.result ?? null;
}

/**
 * Prefetches `.writenow/characters|settings` by detected entities.
 *
 * Why:
 * - Keep UI interactions fast by warming Settings before the user triggers a request/preview.
 * - Use deterministic file-name resolution (no fuzzy matching) to avoid accidental injections.
 */
export async function prefetchByEntities(
  projectId: string,
  input: {
    entities: string[];
    refreshIndex?: boolean;
  },
): Promise<PrefetchByEntitiesResult> {
  const entityList = uniqSorted((Array.isArray(input.entities) ? input.entities : []).map((e) => stripMdExt(e)));
  const index = await getSettingsIndexCached(projectId, input.refreshIndex ? { refresh: true } : undefined);

  const resolved = resolveEntitiesToFiles(index, entityList);
  const loadedAtMs = Date.now();

  if (resolved.characters.length === 0 && resolved.settings.length === 0) {
    const result: PrefetchByEntitiesResult = {
      projectId: index.projectId,
      rootPath: index.rootPath,
      loadedAtMs,
      entities: entityList,
      resolved,
      fragments: [],
      errors: index.errors,
    };
    prefetchCache.set(normalizeKey(projectId), { result });
    return result;
  }

  const loaded = await loadWritenowSettings(projectId, resolved);
  const result: PrefetchByEntitiesResult = {
    projectId: loaded.projectId,
    rootPath: loaded.rootPath,
    loadedAtMs,
    entities: entityList,
    resolved,
    fragments: loaded.fragments,
    errors: [...index.errors, ...loaded.errors],
  };
  prefetchCache.set(normalizeKey(projectId), { result });
  return result;
}
