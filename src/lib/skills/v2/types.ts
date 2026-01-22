import type { IpcErrorCode } from '../../../types/ipc-generated';

export type SkillV2ErrorCode = Extract<IpcErrorCode, 'INVALID_ARGUMENT' | 'IO_ERROR' | 'INTERNAL'>;

export type SkillV2Error = {
  code: SkillV2ErrorCode;
  message: string;
  details?: unknown;
};

export type SkillV2Ok<TData> = {
  ok: true;
  data: TData;
};

export type SkillV2Err = {
  ok: false;
  error: SkillV2Error;
};

export type SkillV2Result<TData> = SkillV2Ok<TData> | SkillV2Err;

/**
 * Returns a successful skill V2 result.
 * Why: callers (UI/indexer) must not depend on thrown exceptions to distinguish parse/validation failures.
 */
export function skillOk<TData>(data: TData): SkillV2Ok<TData> {
  return { ok: true, data };
}

/**
 * Returns a failed skill V2 result with a stable error code.
 * Why: stable error codes are required for recoverable UI + DB indexing (invalid skill must not crash the app).
 */
export function skillErr(code: SkillV2ErrorCode, message: string, details?: unknown): SkillV2Err {
  return { ok: false, error: { code, message, details } };
}

export type SkillScopeV2 = 'builtin' | 'global' | 'project';

export type SkillKindV2 = 'single' | 'workflow';

export type SkillModelTierV2 = 'high' | 'mid' | 'low';

export type SkillPromptV2Draft = {
  system?: string;
  user?: string;
};

export type SkillPromptV2 = {
  system: string;
  user: string;
};

export type SkillVariantWhenV2 = {
  tier?: SkillModelTierV2;
};

export type SkillVariantV2Draft = {
  id?: string;
  when?: SkillVariantWhenV2;
  prompt?: SkillPromptV2Draft;
};

export type SkillVariantV2 = {
  id: string;
  when?: SkillVariantWhenV2;
  prompt: SkillPromptV2;
};

export type SkillOutputV2Draft = {
  format?: string;
  constraints?: string[];
};

export type SkillOutputV2 = {
  format?: string;
  constraints: string[];
};

export type SkillContextLayerPolicyV2 = 'always' | 'never' | 'auto';

export type SkillContextLayersV2 = Partial<Record<'rules' | 'settings' | 'retrieved' | 'immediate', SkillContextLayerPolicyV2>>;

export type SkillContextHintsV2 = {
  maxInstructionTokens?: number;
  preferShortUserInstruction?: boolean;
};

export type SkillContextV2Draft = {
  layers?: SkillContextLayersV2;
  hints?: SkillContextHintsV2;
};

export type SkillContextV2 = {
  layers?: SkillContextLayersV2;
  hints?: SkillContextHintsV2;
};

export type SkillModelProfileV2Draft = {
  tier?: SkillModelTierV2;
  preferred?: string;
};

export type SkillModelProfileV2 = {
  tier?: SkillModelTierV2;
  preferred?: string;
};

export type SkillReferencesSlotLoadV2 = 'on_demand';

export type SkillReferencesSlotV2Draft = {
  directory?: string;
  pattern?: string;
  required?: boolean;
  load?: SkillReferencesSlotLoadV2;
  maxTokens?: number;
};

export type SkillReferencesSlotV2 = {
  directory: string;
  pattern: string;
  required: boolean;
  load: SkillReferencesSlotLoadV2;
  maxTokens?: number;
};

export type SkillReferencesV2Draft = {
  slots?: Record<string, SkillReferencesSlotV2Draft>;
};

export type SkillReferencesV2 = {
  slots?: Record<string, SkillReferencesSlotV2>;
};

export type SkillFrontmatterV2Draft = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  tags?: string[];
  kind?: SkillKindV2;
  scope?: SkillScopeV2;
  packageId?: string;
  modelProfile?: SkillModelProfileV2Draft;
  output?: SkillOutputV2Draft;
  context?: SkillContextV2Draft;
  prompt?: SkillPromptV2Draft;
  variants?: SkillVariantV2Draft[];
  references?: SkillReferencesV2Draft;
  unknown: Record<string, unknown>;
};

export type SkillFrontmatterV2 = Omit<SkillFrontmatterV2Draft, 'id' | 'name' | 'version' | 'tags' | 'kind' | 'prompt' | 'variants' | 'output' | 'context' | 'modelProfile' | 'references'> & {
  id: string;
  name: string;
  version: string;
  tags: string[];
  kind: SkillKindV2;
  prompt?: SkillPromptV2;
  variants?: SkillVariantV2[];
  modelProfile?: SkillModelProfileV2;
  output?: SkillOutputV2;
  context?: SkillContextV2;
  references?: SkillReferencesV2;
};

export type SkillMarkdownV2 = {
  body: string;
  intent?: string;
  userInstruction?: string;
  promptNotes?: string;
  examples?: string;
};

export type SkillDefinitionV2Draft = {
  frontmatter: SkillFrontmatterV2Draft;
  markdown: SkillMarkdownV2;
  raw: {
    /** Original YAML frontmatter as a plain JSON-ish object. */
    frontmatter: Record<string, unknown>;
    /** Markdown body after the closing frontmatter delimiter. */
    markdown: string;
    /** Raw file contents, preserved for round-trip editing. */
    text: string;
  };
};

export type SkillDefinitionV2 = Omit<SkillDefinitionV2Draft, 'frontmatter'> & {
  frontmatter: SkillFrontmatterV2;
};
