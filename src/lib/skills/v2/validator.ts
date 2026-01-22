import { createDefaultTokenEstimator } from '../../context/token-estimator';

import { skillErr, skillOk } from './types';
import type {
  SkillDefinitionV2,
  SkillDefinitionV2Draft,
  SkillFrontmatterV2,
  SkillPromptV2,
  SkillReferencesSlotV2,
  SkillReferencesV2,
  SkillVariantV2,
  SkillV2Result,
} from './types';

const DEFAULT_MAX_INSTRUCTION_TOKENS = 5000;
const MAX_ID_LENGTH = 160;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 280;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 32;
const MAX_SLOTS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSemVer(value: string): boolean {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return false;
  const semver =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semver.test(raw);
}

function normalizeTags(tags: string[] | undefined): string[] {
  const unique = new Set<string>();
  for (const tag of tags ?? []) {
    const trimmed = typeof tag === 'string' ? tag.trim() : '';
    if (!trimmed) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
}

function hasPathTraversal(value: string): boolean {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return false;
  if (raw.startsWith('/') || raw.startsWith('\\')) return true;
  return raw.split(/[\\/]+/).some((part) => part === '..');
}

function estimateTokens(text: string, model: string): number {
  const estimator = createDefaultTokenEstimator();
  return estimator.estimate(text, model).tokens;
}

function resolveMaxInstructionTokens(draft: SkillDefinitionV2Draft, fallback: number): number {
  const hinted = draft.frontmatter.context?.hints?.maxInstructionTokens;
  if (typeof hinted === 'number' && Number.isFinite(hinted) && hinted > 0) return Math.floor(hinted);
  return fallback;
}

function requireBoundedString(value: string | undefined, field: string, maxLen: number): SkillV2Result<string> {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return skillErr('INVALID_ARGUMENT', `${field} is required`, { field, reason: 'missing' });
  if (raw.length > maxLen) return skillErr('INVALID_ARGUMENT', `${field} is too long`, { field, maxLen, actual: raw.length });
  return skillOk(raw);
}

function validateTags(tags: string[]): SkillV2Result<string[]> {
  if (tags.length === 0) return skillErr('INVALID_ARGUMENT', 'tags is required', { field: 'tags', reason: 'missing' });
  if (tags.length > MAX_TAGS) return skillErr('INVALID_ARGUMENT', 'too many tags', { field: 'tags', max: MAX_TAGS, actual: tags.length });

  for (const tag of tags) {
    if (tag.length > MAX_TAG_LENGTH) {
      return skillErr('INVALID_ARGUMENT', 'tag is too long', { field: 'tags', maxLen: MAX_TAG_LENGTH, tag });
    }
  }

  return skillOk(tags);
}

function validatePromptCandidate(prompt: SkillPromptV2 | undefined, contextUserInstruction: string | undefined, model: string, maxTokens: number) {
  const system = typeof prompt?.system === 'string' ? prompt.system : '';
  const user = typeof prompt?.user === 'string' ? prompt.user : '';

  if (!system.trim() || !user.trim()) {
    const missing: string[] = [];
    if (!system.trim()) missing.push('prompt.system');
    if (!user.trim()) missing.push('prompt.user');
    return skillErr('INVALID_ARGUMENT', 'prompt is required', { field: 'prompt', missing });
  }

  const injectable = [system, user, contextUserInstruction ?? ''].filter((part) => part.trim().length > 0).join('\n\n');
  const estimated = estimateTokens(injectable, model);
  if (estimated > maxTokens) {
    return skillErr('INVALID_ARGUMENT', 'skill prompt exceeds instruction token budget', {
      field: 'prompt',
      estimatedTokens: estimated,
      maxTokens,
      suggestion: 'Move long examples to references/ and load on demand, or split into variants/package skills.',
    });
  }

  return skillOk({ system, user });
}

function validateReferences(draft: SkillDefinitionV2Draft): SkillV2Result<SkillReferencesV2 | undefined> {
  const slots = draft.frontmatter.references?.slots;
  if (!slots) return skillOk(undefined);

  const entries = Object.entries(slots);
  if (entries.length > MAX_SLOTS) {
    return skillErr('INVALID_ARGUMENT', 'too many reference slots', { field: 'references.slots', max: MAX_SLOTS, actual: entries.length });
  }

  const normalized: Record<string, SkillReferencesSlotV2> = {};
  for (const [key, slot] of entries) {
    const safeKey = key.trim();
    if (!safeKey) return skillErr('INVALID_ARGUMENT', 'reference slot key is empty', { field: 'references.slots', key });

    const directory = typeof slot.directory === 'string' ? slot.directory.trim() : '';
    const pattern = typeof slot.pattern === 'string' ? slot.pattern.trim() : '';
    const required = slot.required === true;
    const load = slot.load ?? 'on_demand';
    const maxTokens = slot.maxTokens;

    if (!directory || !pattern) {
      return skillErr('INVALID_ARGUMENT', 'reference slot requires directory and pattern', {
        field: `references.slots.${safeKey}`,
        missing: [!directory ? 'directory' : null, !pattern ? 'pattern' : null].filter(Boolean),
      });
    }

    if (hasPathTraversal(directory) || hasPathTraversal(pattern)) {
      return skillErr('INVALID_ARGUMENT', 'reference slot path must be relative and not escape the package', {
        field: `references.slots.${safeKey}`,
        directory,
        pattern,
      });
    }

    if (load !== 'on_demand') {
      return skillErr('INVALID_ARGUMENT', 'unsupported reference slot load policy', { field: `references.slots.${safeKey}.load`, load });
    }

    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || !Number.isFinite(maxTokens) || maxTokens <= 0) {
        return skillErr('INVALID_ARGUMENT', 'invalid reference slot maxTokens', { field: `references.slots.${safeKey}.maxTokens`, maxTokens });
      }
    }

    normalized[safeKey] = { directory, pattern, required, load, ...(maxTokens !== undefined ? { maxTokens: Math.floor(maxTokens) } : {}) };
  }

  return skillOk({ slots: normalized });
}

function validateVariants(
  draft: SkillDefinitionV2Draft,
  model: string,
  maxTokens: number
): SkillV2Result<{ variants?: SkillVariantV2[]; fallbackPrompt?: SkillPromptV2 }> {
  const rawVariants = Array.isArray(draft.frontmatter.variants) ? draft.frontmatter.variants : [];
  if (rawVariants.length === 0) return skillOk({});

  const variants: SkillVariantV2[] = [];
  for (const variant of rawVariants) {
    const id = typeof variant.id === 'string' ? variant.id.trim() : '';
    if (!id) continue;
    const candidate = validatePromptCandidate(variant.prompt as SkillPromptV2 | undefined, draft.markdown.userInstruction, model, maxTokens);
    if (!candidate.ok) {
      const baseDetails = isRecord(candidate.error.details) ? candidate.error.details : {};
      return skillErr(candidate.error.code, candidate.error.message, { ...baseDetails, variantId: id });
    }
    variants.push({ id, when: variant.when, prompt: candidate.data });
  }

  const fallbackPrompt = variants[0]?.prompt;
  return skillOk({ ...(variants.length > 0 ? { variants } : {}), ...(fallbackPrompt ? { fallbackPrompt } : {}) });
}

/**
 * Validates and normalizes a parsed V2 skill definition.
 * Why: the indexer must reliably mark invalid skills without crashing, and the UI needs actionable error details.
 */
export function validateSkillDefinitionV2(draft: SkillDefinitionV2Draft, options?: { model?: string; maxInstructionTokens?: number }): SkillV2Result<SkillDefinitionV2> {
  const id = requireBoundedString(draft.frontmatter.id, 'id', MAX_ID_LENGTH);
  if (!id.ok) return id;

  const name = requireBoundedString(draft.frontmatter.name, 'name', MAX_NAME_LENGTH);
  if (!name.ok) return name;

  const version = requireBoundedString(draft.frontmatter.version, 'version', 32);
  if (!version.ok) return version;
  if (!isValidSemVer(version.data)) {
    return skillErr('INVALID_ARGUMENT', 'version must be valid SemVer', { field: 'version', value: version.data });
  }

  const description = draft.frontmatter.description?.trim();
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return skillErr('INVALID_ARGUMENT', 'description is too long', { field: 'description', maxLen: MAX_DESCRIPTION_LENGTH, actual: description.length });
  }

  const tags = normalizeTags(draft.frontmatter.tags);
  const tagsOk = validateTags(tags);
  if (!tagsOk.ok) return tagsOk;

  const model = typeof options?.model === 'string' && options.model.trim() ? options.model.trim() : draft.frontmatter.modelProfile?.preferred?.trim() || 'claude-3-5-sonnet-latest';
  const maxTokens = resolveMaxInstructionTokens(draft, options?.maxInstructionTokens ?? DEFAULT_MAX_INSTRUCTION_TOKENS);

  const prompt = validatePromptCandidate(draft.frontmatter.prompt as SkillPromptV2 | undefined, draft.markdown.userInstruction, model, maxTokens);
  const variants = validateVariants(draft, model, maxTokens);
  if (!variants.ok) return variants;

  const effectivePrompt: SkillPromptV2 | undefined = prompt.ok ? prompt.data : variants.data.fallbackPrompt;
  if (!effectivePrompt) return prompt;

  const refs = validateReferences(draft);
  if (!refs.ok) return refs;

  const frontmatter: SkillFrontmatterV2 = {
    id: id.data,
    name: name.data,
    description: description || undefined,
    version: version.data,
    tags: tagsOk.data,
    kind: draft.frontmatter.kind ?? 'single',
    scope: draft.frontmatter.scope,
    packageId: draft.frontmatter.packageId,
    modelProfile: draft.frontmatter.modelProfile,
    output: draft.frontmatter.output ? { constraints: draft.frontmatter.output.constraints ?? [], format: draft.frontmatter.output.format } : undefined,
    context: draft.frontmatter.context,
    prompt: effectivePrompt,
    variants: variants.data.variants,
    references: refs.data,
    unknown: draft.frontmatter.unknown,
  };

  return skillOk({
    ...draft,
    frontmatter,
  });
}
