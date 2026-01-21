import type {
  BudgetCompressedEvidence,
  BudgetEvidence,
  BudgetRemovedEvidence,
  ContextFragment,
  ContextFragmentInput,
  ContextLayer,
  TokenStats,
  TokenUsage,
} from '../../types/context';
import type { TokenEstimator } from './token-estimator';

const LAYER_ORDER: ContextLayer[] = ['rules', 'settings', 'retrieved', 'immediate'];

export type TokenBudget = {
  totalLimit: number;
  layerBudgets: Record<ContextLayer, number>;
};

export type BudgetEnforceResult = {
  fragments: ContextFragment[];
  tokenStats: TokenStats;
  budgetEvidence: BudgetEvidence | null;
};

export class TokenBudgetError extends Error {
  code: 'TOKEN_BUDGET_UNSATISFIABLE';
  details: {
    totalLimit: number;
    requiredTokens: number;
    suggestions: string[];
  };

  constructor(message: string, details: TokenBudgetError['details']) {
    super(message);
    this.name = 'TokenBudgetError';
    this.code = 'TOKEN_BUDGET_UNSATISFIABLE';
    this.details = details;
  }
}

function clampBudget(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function sourceKey(source: ContextFragment['source']): string {
  if (source.kind === 'file') return `file:${source.path}`;
  if (source.kind === 'module') return `module:${source.id}`;
  return `conversation:${source.id}:${source.path}`;
}

function stableLayerSortKey(layer: ContextLayer): number {
  const idx = LAYER_ORDER.indexOf(layer);
  return idx === -1 ? 999 : idx;
}

function computeLayerUsed(fragments: ContextFragment[], layer: ContextLayer): number {
  return fragments.reduce((sum, frag) => (frag.layer === layer ? sum + frag.tokenCount : sum), 0);
}

function computeTotalUsed(fragments: ContextFragment[]): number {
  return fragments.reduce((sum, frag) => sum + frag.tokenCount, 0);
}

function computeTokenStats({
  fragments,
  budget,
  estimated,
}: {
  fragments: ContextFragment[];
  budget: TokenBudget;
  estimated: boolean;
}): TokenStats {
  const layers = Object.fromEntries(
    LAYER_ORDER.map((layer): [ContextLayer, TokenUsage] => [
      layer,
      { used: computeLayerUsed(fragments, layer), budget: clampBudget(budget.layerBudgets[layer]) },
    ]),
  ) as Record<ContextLayer, TokenUsage>;

  return {
    total: { used: computeTotalUsed(fragments), limit: clampBudget(budget.totalLimit) },
    layers,
    estimated,
  };
}

function splitParagraphs(text: string): string[] {
  const raw = typeof text === 'string' ? text : '';
  const normalized = raw.replaceAll('\r\n', '\n');
  const parts = normalized.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : normalized.trim() ? [normalized.trim()] : [];
}

function splitSentences(text: string): string[] {
  const raw = typeof text === 'string' ? text : '';
  const normalized = raw.replaceAll('\r\n', '\n').trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  let buf = '';
  const breakers = new Set(['.', '!', '?', '。', '！', '？', '；', ';']);

  for (const ch of normalized) {
    buf += ch;
    if (breakers.has(ch)) {
      const trimmed = buf.trim();
      if (trimmed) sentences.push(trimmed);
      buf = '';
    }
  }

  const tail = buf.trim();
  if (tail) sentences.push(tail);
  return sentences.length > 0 ? sentences : [normalized];
}

function truncateBySemanticUnits({
  text,
  maxTokens,
  estimator,
  model,
}: {
  text: string;
  maxTokens: number;
  estimator: TokenEstimator;
  model: string;
}) {
  const budget = clampBudget(maxTokens);
  if (budget === 0) return { text: '', tokens: 0 };

  const paragraphs = splitParagraphs(text);
  let kept: string[] = [];

  for (const p of paragraphs) {
    const candidate = kept.length > 0 ? `${kept.join('\n\n')}\n\n${p}` : p;
    const candidateTokens = estimator.estimate(candidate, model).tokens;
    if (candidateTokens <= budget) {
      kept = kept.length > 0 ? [...kept, p] : [p];
      continue;
    }
    break;
  }

  if (kept.length > 0) {
    const joined = kept.join('\n\n');
    return { text: joined, tokens: estimator.estimate(joined, model).tokens };
  }

  const first = paragraphs[0] ?? '';
  const sentences = splitSentences(first);
  let keptSentences: string[] = [];

  for (const s of sentences) {
    const candidate = keptSentences.length > 0 ? `${keptSentences.join(' ')} ${s}` : s;
    const candidateTokens = estimator.estimate(candidate, model).tokens;
    if (candidateTokens <= budget) {
      keptSentences = keptSentences.length > 0 ? [...keptSentences, s] : [s];
      continue;
    }
    break;
  }

  if (keptSentences.length === 0) return { text: '', tokens: 0 };
  const joined = keptSentences.join(' ');
  return { text: joined, tokens: estimator.estimate(joined, model).tokens };
}

function formatSourcePointer(source: ContextFragment['source']): string {
  if (source.kind === 'file') return source.path;
  if (source.kind === 'module') return `module:${source.id}`;
  return `conversation:${source.id} (${source.path})`;
}

function compressFragment({
  fragment,
  targetMaxTokens,
  estimator,
  model,
}: {
  fragment: ContextFragment;
  targetMaxTokens: number;
  estimator: TokenEstimator;
  model: string;
}): { compressed: ContextFragment; evidence: BudgetCompressedEvidence } | null {
  const maxTokens = clampBudget(targetMaxTokens);
  if (fragment.tokenCount <= maxTokens) return null;

  const pointer = formatSourcePointer(fragment.source);
  const pointerBlock = `\n\n[Truncated for token budget. Reference: ${pointer}]`;
  const pointerTokens = estimator.estimate(pointerBlock, model).tokens;
  const snippetBudget = Math.max(0, maxTokens - pointerTokens);
  const snippet = truncateBySemanticUnits({ text: fragment.content, maxTokens: snippetBudget, estimator, model });

  const content = snippet.text ? `${snippet.text}${pointerBlock}` : `[Reference: ${pointer}]`;
  const nextTokenCount = estimator.estimate(content, model).tokens;
  if (nextTokenCount >= fragment.tokenCount) return null;

  const toFragmentId = `${fragment.id}~compressed`;
  const compressed: ContextFragment = {
    ...fragment,
    id: toFragmentId,
    content,
    tokenCount: nextTokenCount,
    meta: {
      ...(typeof fragment.meta === 'object' && fragment.meta ? fragment.meta : {}),
      compressedFrom: fragment.id,
      reference: pointer,
    },
  };

  return {
    compressed,
    evidence: {
      fromFragmentId: fragment.id,
      toFragmentId,
      savedTokens: fragment.tokenCount - nextTokenCount,
      reason: 'Compressed to satisfy token budget',
    },
  };
}

function removeCandidatesInOrder({
  fragments,
  layer,
}: {
  fragments: ContextFragment[];
  layer: ContextLayer;
}): Array<{ idx: number; fragment: ContextFragment }> {
  const candidates: Array<{ idx: number; fragment: ContextFragment }> = [];
  for (let idx = 0; idx < fragments.length; idx += 1) {
    const fragment = fragments[idx];
    if (fragment.layer !== layer) continue;
    if (fragment.required) continue;
    candidates.push({ idx, fragment });
  }

  candidates.sort((a, b) => {
    if (a.fragment.priority !== b.fragment.priority) return a.fragment.priority - b.fragment.priority;
    if (a.fragment.tokenCount !== b.fragment.tokenCount) return b.fragment.tokenCount - a.fragment.tokenCount;
    return a.idx - b.idx;
  });

  return candidates;
}

function enforceRemoveUntilWithinLayerBudget({
  fragments,
  layer,
  budget,
  removed,
  reason,
}: {
  fragments: ContextFragment[];
  layer: ContextLayer;
  budget: number;
  removed: BudgetRemovedEvidence[];
  reason: string;
}) {
  const layerBudget = clampBudget(budget);
  let used = computeLayerUsed(fragments, layer);
  if (used <= layerBudget) return fragments;

  const candidates = removeCandidatesInOrder({ fragments, layer });
  const toRemove = new Set<number>();

  for (const c of candidates) {
    if (used <= layerBudget) break;
    toRemove.add(c.idx);
    used -= c.fragment.tokenCount;
    removed.push({
      fragmentId: c.fragment.id,
      layer,
      source: c.fragment.source,
      tokenCount: c.fragment.tokenCount,
      reason,
    });
  }

  if (used > layerBudget) return fragments;
  return fragments.filter((_f, idx) => !toRemove.has(idx));
}

function dedupeWithinLayers(fragments: ContextFragment[]): ContextFragment[] {
  const seen = new Map<string, number>();
  const result: ContextFragment[] = [];

  for (const frag of fragments) {
    const key = `${frag.layer}|${sourceKey(frag.source)}|${frag.content}`;
    const existingIdx = seen.get(key);
    if (typeof existingIdx !== 'number') {
      seen.set(key, result.length);
      result.push(frag);
      continue;
    }

    const existing = result[existingIdx];
    const merged: ContextFragment = {
      ...existing,
      priority: Math.max(existing.priority, frag.priority),
      required: existing.required || frag.required || undefined,
      tokenCount: Math.max(existing.tokenCount, frag.tokenCount),
    };
    result[existingIdx] = merged;
  }

  return result;
}

export class TokenBudgetManager {
  private readonly estimator: TokenEstimator;
  private readonly model: string;
  private readonly budget: TokenBudget;

  constructor(opts: { estimator: TokenEstimator; model: string; budget: TokenBudget }) {
    this.estimator = opts.estimator;
    this.model = opts.model;
    this.budget = {
      totalLimit: clampBudget(opts.budget.totalLimit),
      layerBudgets: {
        rules: clampBudget(opts.budget.layerBudgets.rules),
        settings: clampBudget(opts.budget.layerBudgets.settings),
        retrieved: clampBudget(opts.budget.layerBudgets.retrieved),
        immediate: clampBudget(opts.budget.layerBudgets.immediate),
      },
    };
  }

  enforce(input: ContextFragmentInput[]): BudgetEnforceResult {
    const normalized: ContextFragment[] = input
      .map((frag): ContextFragment => {
        const tokenCount = typeof frag.tokenCount === 'number' ? Math.max(0, Math.floor(frag.tokenCount)) : null;
        const estimated = tokenCount === null ? this.estimator.estimate(frag.content, this.model).tokens : tokenCount;
        return { ...frag, tokenCount: estimated };
      })
      .sort((a, b) => stableLayerSortKey(a.layer) - stableLayerSortKey(b.layer));

    const removed: BudgetRemovedEvidence[] = [];
    const compressed: BudgetCompressedEvidence[] = [];

    let fragments = dedupeWithinLayers(normalized);

    // 1) Enforce per-layer budgets in deterministic order.
    for (const layer of LAYER_ORDER) {
      const layerBudget = this.budget.layerBudgets[layer];
      const used = computeLayerUsed(fragments, layer);
      if (used <= layerBudget) continue;

      if (layer === 'settings') {
        const candidates = removeCandidatesInOrder({ fragments, layer }).map((c) => c.idx);
        const perFragmentCap = Math.max(32, Math.floor(layerBudget / Math.max(1, candidates.length)));

        const next = [...fragments];
        for (const idx of candidates) {
          const currentUsed = computeLayerUsed(next, layer);
          if (currentUsed <= layerBudget) break;
          const original = next[idx];
          const maybe = compressFragment({
            fragment: original,
            targetMaxTokens: perFragmentCap,
            estimator: this.estimator,
            model: this.model,
          });
          if (!maybe) continue;
          next[idx] = maybe.compressed;
          compressed.push(maybe.evidence);
        }
        fragments = next;
      }

      if (computeLayerUsed(fragments, layer) > layerBudget) {
        fragments = enforceRemoveUntilWithinLayerBudget({
          fragments,
          layer,
          budget: layerBudget,
          removed,
          reason: `Removed to satisfy ${layer} layer budget`,
        });
      }
    }

    // 2) Enforce total limit with global trimming priorities.
    const totalLimit = this.budget.totalLimit;
    let totalUsed = computeTotalUsed(fragments);
    const requiredTokens = computeTotalUsed(fragments.filter((f) => f.required));

    if (requiredTokens > totalLimit) {
      throw new TokenBudgetError('Token budget is unsatisfiable: required context exceeds totalLimit', {
        totalLimit,
        requiredTokens,
        suggestions: [
          'Reduce selection length or surrounding context.',
          'Disable extra context (retrieved/settings) for this request.',
          'Increase model context window / totalLimit.',
        ],
      });
    }

    const removeOne = (layer: ContextLayer, reason: string): boolean => {
      const candidates = removeCandidatesInOrder({ fragments, layer });
      const first = candidates[0];
      if (!first) return false;
      const idx = first.idx;
      const frag = first.fragment;
      fragments = fragments.filter((_f, i) => i !== idx);
      removed.push({ fragmentId: frag.id, layer, source: frag.source, tokenCount: frag.tokenCount, reason });
      totalUsed -= frag.tokenCount;
      return true;
    };

    const compressOneSettings = (targetMaxTokens: number): boolean => {
      const layer: ContextLayer = 'settings';
      const candidates = removeCandidatesInOrder({ fragments, layer });
      for (const c of candidates) {
        const original = fragments[c.idx];
        const maybe = compressFragment({ fragment: original, targetMaxTokens, estimator: this.estimator, model: this.model });
        if (!maybe) continue;
        fragments = fragments.map((f, idx) => (idx === c.idx ? maybe.compressed : f));
        compressed.push(maybe.evidence);
        totalUsed = computeTotalUsed(fragments);
        return true;
      }
      return false;
    };

    while (totalUsed > totalLimit) {
      const madeProgress =
        removeOne('retrieved', 'Removed to satisfy total token limit') ||
        compressOneSettings(Math.max(32, Math.floor(this.budget.layerBudgets.settings / 3))) ||
        removeOne('settings', 'Removed to satisfy total token limit') ||
        removeOne('immediate', 'Removed to satisfy total token limit') ||
        removeOne('rules', 'Removed to satisfy total token limit');

      if (!madeProgress) break;
    }

    totalUsed = computeTotalUsed(fragments);
    if (totalUsed > totalLimit) {
      throw new TokenBudgetError('Token budget is unsatisfiable: cannot trim further without losing required context', {
        totalLimit,
        requiredTokens,
        suggestions: [
          'Reduce selection length or surrounding context.',
          'Disable extra context (retrieved/settings) for this request.',
          'Increase model context window / totalLimit.',
        ],
      });
    }

    const tokenStats = computeTokenStats({ fragments, budget: this.budget, estimated: true });
    const budgetEvidence = removed.length > 0 || compressed.length > 0 ? ({ removed, compressed } satisfies BudgetEvidence) : null;

    return { fragments, tokenStats, budgetEvidence };
  }
}

