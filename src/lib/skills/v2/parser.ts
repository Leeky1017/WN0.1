import { parse as parseYaml } from 'yaml';

import { skillErr, skillOk } from './types';
import type {
  SkillContextHintsV2,
  SkillContextLayersV2,
  SkillContextV2Draft,
  SkillDefinitionV2Draft,
  SkillFrontmatterV2Draft,
  SkillKindV2,
  SkillModelProfileV2Draft,
  SkillModelTierV2,
  SkillOutputV2Draft,
  SkillPromptV2Draft,
  SkillReferencesSlotV2Draft,
  SkillReferencesV2Draft,
  SkillScopeV2,
  SkillVariantV2Draft,
  SkillV2Result,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toTrimmedString(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: string[] = [];
  for (const item of value) {
    if (!isNonEmptyString(item)) continue;
    items.push(item.trim());
  }
  return items;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function asPlainRecord(value: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) next[key] = val;
  return next;
}

type FrontmatterSplit = {
  yaml: string;
  markdown: string;
  normalizedText: string;
};

function splitFrontmatter(text: string): SkillV2Result<FrontmatterSplit> {
  const normalizedText = (typeof text === 'string' ? text : '').replaceAll('\r\n', '\n').replace(/^\uFEFF/, '');
  const lines = normalizedText.split('\n');
  if ((lines[0] ?? '').trim() !== '---') {
    return skillErr('INVALID_ARGUMENT', 'Missing YAML frontmatter', { reason: 'missing_frontmatter' });
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return skillErr('INVALID_ARGUMENT', 'Unterminated YAML frontmatter', { reason: 'unterminated_frontmatter' });
  }

  const yaml = lines.slice(1, endIndex).join('\n');
  const markdown = lines.slice(endIndex + 1).join('\n');
  return skillOk({ yaml, markdown, normalizedText });
}

function parseSkillKind(value: unknown): SkillKindV2 | undefined {
  const v = toTrimmedString(value);
  if (!v) return undefined;
  if (v === 'single' || v === 'workflow') return v;
  return undefined;
}

function parseSkillScope(value: unknown): SkillScopeV2 | undefined {
  const v = toTrimmedString(value);
  if (!v) return undefined;
  if (v === 'builtin' || v === 'global' || v === 'project') return v;
  return undefined;
}

function parseModelTier(value: unknown): SkillModelTierV2 | undefined {
  const v = toTrimmedString(value);
  if (!v) return undefined;
  if (v === 'high' || v === 'mid' || v === 'low') return v;
  return undefined;
}

function parsePrompt(value: unknown): SkillPromptV2Draft | undefined {
  if (!isRecord(value)) return undefined;
  const system = typeof value.system === 'string' ? value.system : undefined;
  const user = typeof value.user === 'string' ? value.user : undefined;
  if (system === undefined && user === undefined) return undefined;
  return { system, user };
}

function parseOutput(value: unknown): SkillOutputV2Draft | undefined {
  if (!isRecord(value)) return undefined;
  const format = toTrimmedString(value.format);
  const constraints = toStringArray(value.constraints);
  if (!format && !constraints) return undefined;
  return {
    ...(format ? { format } : {}),
    ...(constraints ? { constraints } : {}),
  };
}

function parseContextLayers(value: unknown): SkillContextLayersV2 | undefined {
  if (!isRecord(value)) return undefined;
  const next: SkillContextLayersV2 = {};
  const keys: Array<keyof SkillContextLayersV2> = ['rules', 'settings', 'retrieved', 'immediate'];
  for (const key of keys) {
    const raw = toTrimmedString(value[key]);
    if (!raw) continue;
    if (raw === 'always' || raw === 'never' || raw === 'auto') {
      next[key] = raw;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function parseContextHints(value: unknown): SkillContextHintsV2 | undefined {
  if (!isRecord(value)) return undefined;
  const maxInstructionTokens = toFiniteNumber(value.maxInstructionTokens);
  const preferShortUserInstruction = toBoolean(value.preferShortUserInstruction);
  if (maxInstructionTokens === undefined && preferShortUserInstruction === undefined) return undefined;
  return {
    ...(maxInstructionTokens !== undefined ? { maxInstructionTokens } : {}),
    ...(preferShortUserInstruction !== undefined ? { preferShortUserInstruction } : {}),
  };
}

function parseContext(value: unknown): SkillContextV2Draft | undefined {
  if (!isRecord(value)) return undefined;
  const layers = parseContextLayers(value.layers);
  const hints = parseContextHints(value.hints);
  if (!layers && !hints) return undefined;
  return { ...(layers ? { layers } : {}), ...(hints ? { hints } : {}) };
}

function parseModelProfile(value: unknown): SkillModelProfileV2Draft | undefined {
  if (!isRecord(value)) return undefined;
  const tier = parseModelTier(value.tier);
  const preferred = toTrimmedString(value.preferred);
  if (!tier && !preferred) return undefined;
  return { ...(tier ? { tier } : {}), ...(preferred ? { preferred } : {}) };
}

function parseReferenceSlot(value: unknown): SkillReferencesSlotV2Draft | undefined {
  if (!isRecord(value)) return undefined;
  const directory = toTrimmedString(value.directory);
  const pattern = toTrimmedString(value.pattern);
  const required = toBoolean(value.required);
  const load = toTrimmedString(value.load) === 'on_demand' ? 'on_demand' : undefined;
  const maxTokens = toFiniteNumber(value.maxTokens);
  if (!directory && !pattern && required === undefined && !load && maxTokens === undefined) return undefined;
  return {
    ...(directory ? { directory } : {}),
    ...(pattern ? { pattern } : {}),
    ...(required !== undefined ? { required } : {}),
    ...(load ? { load } : {}),
    ...(maxTokens !== undefined ? { maxTokens } : {}),
  };
}

function parseReferences(value: unknown): SkillReferencesV2Draft | undefined {
  if (!isRecord(value)) return undefined;
  const slotsRaw = value.slots;
  if (!isRecord(slotsRaw)) return undefined;

  const slots: Record<string, SkillReferencesSlotV2Draft> = {};
  for (const [key, entry] of Object.entries(slotsRaw)) {
    const slot = parseReferenceSlot(entry);
    if (!slot) continue;
    slots[key] = slot;
  }

  if (Object.keys(slots).length === 0) return undefined;
  return { slots };
}

function parseVariants(value: unknown): SkillVariantV2Draft[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const variants: SkillVariantV2Draft[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = toTrimmedString(entry.id);
    const when = isRecord(entry.when) ? { ...(parseModelTier(entry.when.tier) ? { tier: parseModelTier(entry.when.tier) } : {}) } : undefined;
    const prompt = parsePrompt(entry.prompt);
    variants.push({ ...(id ? { id } : {}), ...(when && Object.keys(when).length > 0 ? { when } : {}), ...(prompt ? { prompt } : {}) });
  }
  return variants.length > 0 ? variants : undefined;
}

function parseMarkdownSections(body: string) {
  const normalized = typeof body === 'string' ? body.replaceAll('\r\n', '\n') : '';
  const lines = normalized.split('\n');
  const sections: Record<string, string> = {};

  let currentTitle: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections[currentTitle] = buffer.join('\n').trim();
  };

  for (const line of lines) {
    const match = /^##\s+(.*)\s*$/.exec(line);
    if (match) {
      flush();
      currentTitle = match[1]?.trim() ?? '';
      buffer = [];
      continue;
    }
    buffer.push(line);
  }

  flush();
  return sections;
}

function pickSectionText(sections: Record<string, string>, names: string[]): string | undefined {
  for (const name of names) {
    for (const [title, value] of Object.entries(sections)) {
      if (title.trim().toLowerCase() === name.toLowerCase()) {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
    }
  }
  return undefined;
}

/**
 * Parses a V2 `SKILL.md` file into a structured draft object.
 * Why: indexing and Skill Studio must share the same parse shape before running stricter validation.
 */
export function parseSkillDefinitionV2(text: string): SkillV2Result<SkillDefinitionV2Draft> {
  const split = splitFrontmatter(text);
  if (!split.ok) return split;

  let parsed: unknown;
  try {
    parsed = parseYaml(split.data.yaml);
  } catch (error) {
    return skillErr('INVALID_ARGUMENT', 'Invalid YAML frontmatter', {
      reason: 'yaml_parse_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (parsed === null || parsed === undefined) {
    return skillErr('INVALID_ARGUMENT', 'Empty YAML frontmatter', { reason: 'empty_frontmatter' });
  }

  if (!isRecord(parsed)) {
    return skillErr('INVALID_ARGUMENT', 'YAML frontmatter must be a mapping', { reason: 'frontmatter_not_object' });
  }

  const frontmatterRaw = asPlainRecord(parsed);
  const tags = toStringArray(frontmatterRaw.tags) ?? (isNonEmptyString(frontmatterRaw.tag) ? [frontmatterRaw.tag.trim()] : undefined);

  const frontmatter: SkillFrontmatterV2Draft = {
    id: toTrimmedString(frontmatterRaw.id),
    name: toTrimmedString(frontmatterRaw.name),
    description: toTrimmedString(frontmatterRaw.description),
    version: toTrimmedString(frontmatterRaw.version),
    tags,
    kind: parseSkillKind(frontmatterRaw.kind),
    scope: parseSkillScope(frontmatterRaw.scope),
    packageId: toTrimmedString(frontmatterRaw.packageId ?? frontmatterRaw.package_id),
    modelProfile: parseModelProfile(frontmatterRaw.modelProfile),
    output: parseOutput(frontmatterRaw.output),
    context: parseContext(frontmatterRaw.context),
    prompt: parsePrompt(frontmatterRaw.prompt),
    variants: parseVariants(frontmatterRaw.variants),
    references: parseReferences(frontmatterRaw.references),
    unknown: frontmatterRaw,
  };

  const markdown = split.data.markdown;
  const sections = parseMarkdownSections(markdown);
  const intent = pickSectionText(sections, ['intent', '意图']);
  const userInstruction = pickSectionText(sections, ['user instruction', '用户指令']);
  const promptNotes = pickSectionText(sections, ['prompt notes', '提示说明']);
  const examples = pickSectionText(sections, ['examples', '示例']);

  return skillOk({
    frontmatter,
    markdown: { body: markdown, ...(intent ? { intent } : {}), ...(userInstruction ? { userInstruction } : {}), ...(promptNotes ? { promptNotes } : {}), ...(examples ? { examples } : {}) },
    raw: { frontmatter: frontmatterRaw, markdown, text: split.data.normalizedText },
  });
}

