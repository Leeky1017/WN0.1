import type { ContextFragmentInput } from '../../../types/context';
import type { ContextWritenowRulesGetResponse, WritenowLoaderError, WritenowRuleFragment } from '../../../types/ipc';

import { invoke } from '../../ipc';
import { joinWritenowPath, WRITENOW_RULES_CONSTRAINTS, WRITENOW_RULES_STYLE, WRITENOW_RULES_TERMINOLOGY } from '../writenow-paths';

export type LoadedRules = {
  projectId: string;
  rootPath: string;
  loadedAtMs: number | null;
  fragments: ContextFragmentInput[];
  errors: WritenowLoaderError[];
};

function getRulePriority(kind: WritenowRuleFragment['kind']): number {
  if (kind === 'style') return 100;
  if (kind === 'constraints') return 95;
  return 90;
}

function getRuleStableOrderKey(pathInWritenow: string): number {
  if (pathInWritenow === WRITENOW_RULES_STYLE) return 1;
  if (pathInWritenow === WRITENOW_RULES_TERMINOLOGY) return 2;
  if (pathInWritenow === WRITENOW_RULES_CONSTRAINTS) return 3;
  return 99;
}

export async function loadProjectRules(projectId: string, options?: { refresh?: boolean }): Promise<LoadedRules> {
  const res: ContextWritenowRulesGetResponse = await invoke('context:writenow:rules:get', {
    projectId,
    ...(options?.refresh ? { refresh: true } : {}),
  });

  const fragments: ContextFragmentInput[] = res.fragments
    .map((frag) => {
      const pathInWritenow = joinWritenowPath(frag.path);
      return {
        id: `rules:${frag.kind}:${frag.path}`,
        layer: 'rules',
        source: { kind: 'file', path: pathInWritenow },
        content: frag.content,
        priority: getRulePriority(frag.kind),
        meta: { kind: frag.kind, updatedAtMs: frag.updatedAtMs, stableOrder: getRuleStableOrderKey(pathInWritenow) },
      };
    })
    .sort((a, b) => {
      const ak = typeof a.meta === 'object' && a.meta ? (a.meta as Record<string, unknown>).stableOrder : null;
      const bk = typeof b.meta === 'object' && b.meta ? (b.meta as Record<string, unknown>).stableOrder : null;
      const an = typeof ak === 'number' ? ak : 99;
      const bn = typeof bk === 'number' ? bk : 99;
      if (an !== bn) return an - bn;
      return a.id.localeCompare(b.id);
    });

  return {
    projectId: res.projectId,
    rootPath: res.rootPath,
    loadedAtMs: res.loadedAtMs,
    fragments,
    errors: res.errors,
  };
}

export type RulesLoaderError = WritenowLoaderError;

