import type { AssembleResult, ContextFragment, ContextFragmentInput, EditorContext } from '../../types/context';

import { TokenBudgetError, TokenBudgetManager, type TokenBudget } from './budget';
import { loadProjectRules } from './loaders/rules-loader';
import { getPrefetchedSettings, loadWritenowSettings } from './loaders/settings-loader';
import { loadPreviousReferenceFragments } from './previous-reference';
import { renderPromptTemplate, type PromptTemplateSkill } from './prompt-template';
import { createDefaultTokenEstimator } from './token-estimator';

export type ContextAssemblerInput = {
  projectId: string;
  articleId?: string;
  model: string;
  budget: TokenBudget;
  skill: PromptTemplateSkill;
  editorContext?: EditorContext;
  userInstruction: string;
  settings?: {
    characters?: string[];
    settings?: string[];
  };
  retrieved?: ContextFragmentInput[];
};

export type ContextAssemblerDeps = {
  loadRules: typeof loadProjectRules;
  loadSettings: typeof loadWritenowSettings;
  loadPreviousReferences: typeof loadPreviousReferenceFragments;
  getPrefetchedSettings: typeof getPrefetchedSettings;
};

function ensureLayer(
  fragments: ContextFragmentInput[] | undefined,
  layer: ContextFragment['layer'],
): ContextFragmentInput[] {
  const list = Array.isArray(fragments) ? fragments : [];
  return list.map((f) => ({ ...f, layer }));
}

function stableEntities(input: string[] | undefined): string[] {
  const list = Array.isArray(input) ? input : [];
  return Array.from(new Set(list.map((e) => (typeof e === 'string' ? e.trim() : '')).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function listEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function buildImmediateFragments(input: { editorContext?: EditorContext; userInstruction: string }): ContextFragmentInput[] {
  const immediate: ContextFragmentInput[] = [];

  const instruction = typeof input.userInstruction === 'string' ? input.userInstruction.trim() : '';
  immediate.push({
    id: 'immediate:user-instruction',
    layer: 'immediate',
    source: { kind: 'module', id: 'editor:user-instruction' },
    content: instruction,
    priority: 1000,
    required: true,
  });

  const ctx = input.editorContext;
  if (!ctx) return immediate;

  const selectedText = typeof ctx.selectedText === 'string' ? ctx.selectedText.trim() : '';
  if (selectedText) {
    immediate.push({
      id: 'immediate:selection',
      layer: 'immediate',
      source: { kind: 'module', id: 'editor:selection' },
      content: selectedText,
      priority: 950,
      required: true,
    });
  }

  const currentParagraph = typeof ctx.currentParagraph === 'string' ? ctx.currentParagraph.trim() : '';
  if (currentParagraph) {
    immediate.push({
      id: 'immediate:current-paragraph',
      layer: 'immediate',
      source: { kind: 'module', id: 'editor:current-paragraph' },
      content: currentParagraph,
      priority: 800,
    });
  }

  const before = Array.isArray(ctx.surroundingParagraphs?.before) ? ctx.surroundingParagraphs.before : [];
  const after = Array.isArray(ctx.surroundingParagraphs?.after) ? ctx.surroundingParagraphs.after : [];

  const beforeText = before.map((p) => String(p || '').trim()).filter(Boolean).join('\n\n');
  if (beforeText) {
    immediate.push({
      id: 'immediate:before',
      layer: 'immediate',
      source: { kind: 'module', id: 'editor:before' },
      content: beforeText,
      priority: 600,
    });
  }

  const afterText = after.map((p) => String(p || '').trim()).filter(Boolean).join('\n\n');
  if (afterText) {
    immediate.push({
      id: 'immediate:after',
      layer: 'immediate',
      source: { kind: 'module', id: 'editor:after' },
      content: afterText,
      priority: 600,
    });
  }

  const meta = `Cursor: line ${ctx.cursorLine}, column ${ctx.cursorColumn}`;
  immediate.push({
    id: 'immediate:cursor',
    layer: 'immediate',
    source: { kind: 'module', id: 'editor:cursor' },
    content: meta,
    priority: 700,
  });

  return immediate;
}

export class ContextAssembler {
  private readonly deps: ContextAssemblerDeps;

  constructor(deps?: Partial<ContextAssemblerDeps>) {
    this.deps = {
      loadRules: deps?.loadRules ?? loadProjectRules,
      loadSettings: deps?.loadSettings ?? loadWritenowSettings,
      loadPreviousReferences: deps?.loadPreviousReferences ?? loadPreviousReferenceFragments,
      getPrefetchedSettings: deps?.getPrefetchedSettings ?? getPrefetchedSettings,
    };
  }

  async assemble(input: ContextAssemblerInput): Promise<AssembleResult> {
    const estimator = createDefaultTokenEstimator();

    const rulesLoaded = await this.deps.loadRules(input.projectId);
    const rules = ensureLayer(rulesLoaded.fragments, 'rules');

    const desiredEntities = stableEntities(input.editorContext?.detectedEntities);
    const prefetched = desiredEntities.length > 0 ? this.deps.getPrefetchedSettings(input.projectId) : null;
    const canUsePrefetched = prefetched && listEqual(stableEntities(prefetched.entities), desiredEntities) && prefetched.fragments.length > 0;

    const hasExplicitSettings = Boolean(input.settings && (Array.isArray(input.settings.characters) || Array.isArray(input.settings.settings)));
    const settingsLoaded = hasExplicitSettings
      ? await this.deps.loadSettings(input.projectId, {
            ...(Array.isArray(input.settings.characters) ? { characters: input.settings.characters } : {}),
            ...(Array.isArray(input.settings.settings) ? { settings: input.settings.settings } : {}),
          })
      : null;

    const settings =
      !hasExplicitSettings && canUsePrefetched ? ensureLayer(prefetched.fragments, 'settings') : ensureLayer(settingsLoaded?.fragments, 'settings');

    const previousReferences = await this.deps.loadPreviousReferences({
      projectId: input.projectId,
      articleId: input.articleId,
      userInstruction: input.userInstruction,
    });
    const retrieved = ensureLayer([...(Array.isArray(input.retrieved) ? input.retrieved : []), ...previousReferences], 'retrieved');
    const immediate = ensureLayer(buildImmediateFragments(input), 'immediate');

    const candidates: ContextFragmentInput[] = [...rules, ...settings, ...retrieved, ...immediate];

    const estimateMessageTokens = (role: 'system' | 'user', content: string) => {
      if (estimator.estimateMessage) return estimator.estimateMessage({ role, content }, input.model).tokens;
      return estimator.estimate(content, input.model).tokens;
    };

    const enforceWithBudget = (budget: TokenBudget) =>
      new TokenBudgetManager({
        estimator,
        model: input.model,
        budget,
      }).enforce(candidates);

    const maxAttempts = 3;
    let enforced = enforceWithBudget(input.budget);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const finalFragments = enforced.fragments;
      const byLayer = (layer: ContextFragment['layer']) => finalFragments.filter((f) => f.layer === layer);

      const rendered = renderPromptTemplate({
        skill: input.skill,
        rules: byLayer('rules'),
        settings: byLayer('settings'),
        retrieved: byLayer('retrieved'),
        immediate: byLayer('immediate'),
      });

      const systemTokens = estimateMessageTokens('system', rendered.systemPrompt);
      const userTokens = estimateMessageTokens('user', rendered.userContent);
      const totalPromptTokens = systemTokens + userTokens;

      if (totalPromptTokens <= input.budget.totalLimit) {
        return {
          systemPrompt: rendered.systemPrompt,
          userContent: rendered.userContent,
          messages: [
            { role: 'system', content: rendered.systemPrompt },
            { role: 'user', content: rendered.userContent },
          ],
          fragments: finalFragments,
          tokenStats: {
            ...enforced.tokenStats,
            total: { used: totalPromptTokens, limit: input.budget.totalLimit },
          },
          budgetEvidence: enforced.budgetEvidence,
        };
      }

      const fragmentsTokens = finalFragments.reduce((sum, f) => sum + f.tokenCount, 0);
      const overhead = Math.max(0, totalPromptTokens - fragmentsTokens);
      const adjustedTotalLimit = Math.max(0, input.budget.totalLimit - overhead);

      enforced = enforceWithBudget({ ...input.budget, totalLimit: adjustedTotalLimit });
    }

    throw new TokenBudgetError('Token budget is unsatisfiable after accounting for prompt template overhead', {
      totalLimit: input.budget.totalLimit,
      requiredTokens: enforced.fragments.filter((f) => f.required).reduce((sum, f) => sum + f.tokenCount, 0),
      suggestions: [
        'Reduce selection length or surrounding context.',
        'Disable extra context (retrieved/settings) for this request.',
        'Increase model context window / totalLimit.',
      ],
    });
  }
}
