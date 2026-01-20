import { create } from 'zustand';

import { constraintsOps, IpcError } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

import type { ConstraintRule, ConstraintType } from '../types/constraints';
import type { ConstraintsConfig, ConstraintsScopeConfig } from '../types/ipc';

type ConstraintsState = {
  isLoading: boolean;
  loadError: string | null;
  config: ConstraintsConfig;

  load: () => Promise<void>;
  save: (config: ConstraintsConfig) => Promise<void>;

  getEffectiveScopeConfig: (projectId?: string) => ConstraintsScopeConfig;
  getEffectiveRules: (projectId?: string) => ConstraintRule[];
};

function toErrorMessage(error: unknown): string {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildRuleId(scope: 'global' | 'project', type: ConstraintType, projectId?: string): string {
  if (scope === 'project') return `project:${projectId ?? 'unknown'}:${type}`;
  return `global:${type}`;
}

function buildDefaultRules(scope: 'global' | 'project', projectId?: string): ConstraintRule[] {
  const base = scope === 'project' ? { scope, projectId } : { scope };
  return [
    {
      id: buildRuleId(scope, 'forbidden_words', projectId),
      type: 'forbidden_words',
      enabled: false,
      config: { words: [] },
      level: 'error',
      ...base,
    },
    {
      id: buildRuleId(scope, 'word_count', projectId),
      type: 'word_count',
      enabled: false,
      config: { min: undefined, max: undefined },
      level: 'warning',
      ...base,
    },
    {
      id: buildRuleId(scope, 'format', projectId),
      type: 'format',
      enabled: false,
      config: { mode: 'list_only' },
      level: 'warning',
      ...base,
    },
    {
      id: buildRuleId(scope, 'terminology', projectId),
      type: 'terminology',
      enabled: false,
      config: { terms: [] },
      level: 'warning',
      ...base,
    },
    {
      id: buildRuleId(scope, 'tone', projectId),
      type: 'tone',
      enabled: false,
      config: { tone: '' },
      level: 'warning',
      ...base,
    },
    {
      id: buildRuleId(scope, 'coverage', projectId),
      type: 'coverage',
      enabled: false,
      config: { points: [] },
      level: 'warning',
      ...base,
    },
  ];
}

function buildDefaultConfig(): ConstraintsConfig {
  return {
    version: 1,
    global: {
      l2Enabled: true,
      rules: buildDefaultRules('global'),
    },
    projects: {},
  };
}

function mergeRules(globalRules: ConstraintRule[], projectRules: ConstraintRule[]): ConstraintRule[] {
  const byType = new Map<ConstraintType, ConstraintRule>();
  for (const rule of globalRules) byType.set(rule.type, rule);
  for (const rule of projectRules) byType.set(rule.type, rule);
  return Array.from(byType.values());
}

export const useConstraintsStore = create<ConstraintsState>((set, get) => ({
  isLoading: false,
  loadError: null,
  config: buildDefaultConfig(),

  load: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const res = await constraintsOps.getConfig();
      set({ config: res.config, isLoading: false, loadError: null });
    } catch (error) {
      set({ isLoading: false, loadError: toErrorMessage(error), config: buildDefaultConfig() });
    }
  },

  save: async (config) => {
    set({ isLoading: true, loadError: null });
    try {
      const res = await constraintsOps.setConfig({ config });
      set({ config: res.config, isLoading: false, loadError: null });
    } catch (error) {
      set({ isLoading: false, loadError: toErrorMessage(error) });
      throw error;
    }
  },

  getEffectiveScopeConfig: (projectId) => {
    const cfg = get().config;
    const project = projectId ? cfg.projects[projectId] : undefined;
    if (!project) return cfg.global;
    return {
      l2Enabled: project.l2Enabled,
      rules: mergeRules(cfg.global.rules, project.rules),
    };
  },

  getEffectiveRules: (projectId) => {
    return get().getEffectiveScopeConfig(projectId).rules;
  },
}));

