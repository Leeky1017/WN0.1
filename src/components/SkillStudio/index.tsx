import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { stringify as stringifyYaml } from 'yaml';

import { IpcError, skillOps } from '../../lib/ipc';
import { toUserMessage } from '../../lib/errors';
import { createDefaultTokenEstimator } from '../../lib/context/token-estimator';
import { renderPromptTemplate } from '../../lib/context/prompt-template';
import { parseSkillDefinitionV2 } from '../../lib/skills/v2/parser';
import { validateSkillDefinitionV2 } from '../../lib/skills/v2/validator';
import { useProjectsStore } from '../../stores/projectsStore';
import { useSkillsStore } from '../../stores/skillsStore';

import type { ContextFragment } from '../../types/context';
import type { IpcErrorCode, SkillScope, SkillWriteRequest } from '../../types/ipc';
import type { SkillDefinitionV2 } from '../../lib/skills/v2/types';

type SkillStudioMode = 'create' | 'edit';

type SkillStudioProps = {
  mode: SkillStudioMode;
  skillId?: string;
  onClose: () => void;
};

type StudioFormState = {
  scope: Exclude<SkillScope, 'builtin'>;
  packageId: string;
  version: string;
  skillSlug: string;
  id: string;
  name: string;
  description: string;
  tags: string;
  modelPreferred: string;
  maxInstructionTokens: number;
  systemPrompt: string;
  userPrompt: string;
  outputOnlyResult: boolean;
  noExplanations: boolean;
  noCodeBlocks: boolean;
  intent: string;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof IpcError) return toDetailedUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function toDetailedUserMessage(code: IpcErrorCode, message?: string): string {
  const base = toUserMessage(code);
  const detail = typeof message === 'string' ? message.trim() : '';
  if (!detail) return base;
  if (base && base !== code) return `${base}: ${detail}`;
  return detail;
}

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function slugify(value: string): string {
  const raw = coerceString(value).trim().toLowerCase();
  const ascii = raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return ascii;
}

function inferSkillSlugFromId(id: string): string {
  const raw = coerceString(id).trim();
  const afterColon = raw.includes(':') ? raw.split(':').slice(1).join(':') : raw;
  const slug = slugify(afterColon);
  return slug || `skill-${Date.now()}`;
}

function inferPackageId(scope: Exclude<SkillScope, 'builtin'>): string {
  return scope === 'project' ? 'pkg.user.project' : 'pkg.user.global';
}

function inferSkillId(scope: Exclude<SkillScope, 'builtin'>, name: string): string {
  const slug = slugify(name);
  const suffix = slug || `skill-${Date.now()}`;
  return `${scope}:${suffix}`;
}

function parseTagsCsv(value: string): string[] {
  const raw = coerceString(value);
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function buildSkillMd(def: StudioFormState): { text: string; frontmatter: Record<string, unknown> } {
  const tags = parseTagsCsv(def.tags);
  const constraints: string[] = [];
  if (def.outputOnlyResult) constraints.push('Output ONLY rewritten text');
  if (def.noExplanations) constraints.push('No explanations');
  if (def.noCodeBlocks) constraints.push('No code blocks');

  const frontmatter: Record<string, unknown> = {
    id: def.id.trim(),
    name: def.name.trim(),
    ...(def.description.trim() ? { description: def.description.trim() } : {}),
    version: def.version.trim(),
    tags,
    kind: 'single',
    scope: def.scope,
    packageId: def.packageId.trim(),
    modelProfile: {
      tier: 'high',
      preferred: def.modelPreferred.trim(),
    },
    output: {
      format: 'plain_text',
      constraints,
    },
    prompt: {
      system: def.systemPrompt,
      user: def.userPrompt,
    },
    context: {
      hints: {
        maxInstructionTokens: def.maxInstructionTokens,
      },
    },
  };

  const yamlText = stringifyYaml(frontmatter).trimEnd();
  const intent = def.intent.trim();
  const body = intent ? `\n## Intent\n\n${intent}\n` : '\n';
  return { text: `---\n${yamlText}\n---\n${body}`, frontmatter };
}

function extractFrontmatterString(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return '';
  const rec = value as Record<string, unknown>;
  const raw = rec[key];
  return typeof raw === 'string' ? raw : '';
}

function deriveWriteTargetFromSourceUri(sourceUri: string): { packageVersion: string; skillSlug: string } | null {
  const normalized = coerceString(sourceUri).replaceAll('\\', '/');
  const parts = normalized.split('/');
  const idxPackages = parts.lastIndexOf('packages');
  if (idxPackages === -1) return null;
  const packageVersion = parts[idxPackages + 2] ?? '';
  const skillsIdx = parts.indexOf('skills', idxPackages);
  const skillSlug = skillsIdx !== -1 ? parts[skillsIdx + 1] ?? '' : '';
  if (!packageVersion || !skillSlug) return null;
  return { packageVersion, skillSlug };
}

function toPromptTemplateSkill(def: SkillDefinitionV2) {
  const constraints = def.frontmatter.output?.constraints ?? [];
  const format = typeof def.frontmatter.output?.format === 'string' ? def.frontmatter.output.format : 'plain_text';
  return {
    id: def.frontmatter.id,
    name: def.frontmatter.name,
    description: def.frontmatter.description,
    systemPrompt: def.frontmatter.prompt?.system,
    outputConstraints: constraints,
    outputFormat: format === 'plain_text' ? 'plain text' : format,
  };
}

/**
 * Skill Studio modal: form editor + validation + preview.
 * Why: `SKILL.md` is SSOT; users need a safe UI to create/edit without writing YAML by hand.
 */
export function SkillStudio(props: SkillStudioProps) {
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);
  const refreshSkills = useSkillsStore((s) => s.refresh);
  const readSkill = useSkillsStore((s) => s.read);

  const [loading, setLoading] = useState(props.mode === 'edit');
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);

  const [form, setForm] = useState<StudioFormState>(() => ({
    scope: 'global',
    packageId: inferPackageId('global'),
    version: '1.0.0',
    skillSlug: 'my-skill',
    id: 'global:my-skill',
    name: '',
    description: '',
    tags: 'rewrite',
    modelPreferred: 'claude-3-5-sonnet-latest',
    maxInstructionTokens: 5000,
    systemPrompt: "You are WriteNow's writing assistant. Follow output constraints strictly.",
    userPrompt: '请对下面的文本进行改写。\n\n原文：\n{{text}}\n',
    outputOnlyResult: true,
    noExplanations: true,
    noCodeBlocks: true,
    intent: '',
  }));

  useEffect(() => {
    let cancelled = false;
    if (props.mode !== 'edit') return () => undefined;
    if (!props.skillId) {
      setError('Missing skillId');
      setLoading(false);
      return () => undefined;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await readSkill(props.skillId ?? '');
        if (cancelled) return;
        setSourceUri(typeof detail.sourceUri === 'string' ? detail.sourceUri : null);

        const rawText = typeof detail.rawText === 'string' ? detail.rawText : '';
        const parsed = parseSkillDefinitionV2(rawText);
        if (!parsed.ok) {
          setError(toDetailedUserMessage(parsed.error.code, parsed.error.message));
          setLoading(false);
          return;
        }
        const validated = validateSkillDefinitionV2(parsed.data);
        if (!validated.ok) {
          setError(toDetailedUserMessage(validated.error.code, validated.error.message));
          setLoading(false);
          return;
        }

        const def = validated.data;
        const scope = (detail.scope === 'project' ? 'project' : 'global') as Exclude<SkillScope, 'builtin'>;
        const packageId = detail.packageId ?? extractFrontmatterString(def.raw.frontmatter, 'packageId') ?? inferPackageId(scope);
        const inferredSlug = inferSkillSlugFromId(def.frontmatter.id);

        setForm((prev) => ({
          ...prev,
          scope,
          packageId,
          id: def.frontmatter.id,
          name: def.frontmatter.name,
          description: def.frontmatter.description ?? '',
          version: def.frontmatter.version,
          tags: (def.frontmatter.tags ?? []).join(', '),
          modelPreferred: def.frontmatter.modelProfile?.preferred ?? prev.modelPreferred,
          maxInstructionTokens: def.frontmatter.context?.hints?.maxInstructionTokens ?? prev.maxInstructionTokens,
          systemPrompt: def.frontmatter.prompt?.system ?? prev.systemPrompt,
          userPrompt: def.frontmatter.prompt?.user ?? prev.userPrompt,
          outputOnlyResult: (def.frontmatter.output?.constraints ?? []).includes('Output ONLY rewritten text'),
          noExplanations: (def.frontmatter.output?.constraints ?? []).includes('No explanations'),
          noCodeBlocks: (def.frontmatter.output?.constraints ?? []).includes('No code blocks'),
          intent: def.markdown.intent ?? '',
          skillSlug: inferredSlug,
        }));
      } catch (e) {
        if (!cancelled) setError(toErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props.mode, props.skillId, readSkill]);

  useEffect(() => {
    if (props.mode !== 'create') return;
    setForm((prev) => {
      const nextScope = prev.scope;
      const nextId = prev.name.trim() && (!prev.id.trim() || prev.id.startsWith('global:my-skill')) ? inferSkillId(nextScope, prev.name) : prev.id;
      const nextSlug = inferSkillSlugFromId(nextId);
      return { ...prev, id: nextId, skillSlug: nextSlug, packageId: prev.packageId.trim() ? prev.packageId : inferPackageId(nextScope) };
    });
  }, [props.mode]);

  const generated = useMemo(() => buildSkillMd(form), [form]);
  const estimator = useMemo(() => createDefaultTokenEstimator(), []);

  const validation = useMemo(() => {
    const parsed = parseSkillDefinitionV2(generated.text);
    if (!parsed.ok) return { ok: false as const, error: toDetailedUserMessage(parsed.error.code, parsed.error.message) };
    const validated = validateSkillDefinitionV2(parsed.data);
    if (!validated.ok) return { ok: false as const, error: toDetailedUserMessage(validated.error.code, validated.error.message) };
    return { ok: true as const, def: validated.data };
  }, [generated.text]);

  const tokenStats = useMemo(() => {
    const system = form.systemPrompt ?? '';
    const user = form.userPrompt ?? '';
    const constraints: string[] = [];
    if (form.outputOnlyResult) constraints.push('Output ONLY rewritten text');
    if (form.noExplanations) constraints.push('No explanations');
    if (form.noCodeBlocks) constraints.push('No code blocks');
    const joined = [system, user, constraints.join('\n')].join('\n\n');
    const tokens = estimator.estimate(joined, form.modelPreferred).tokens;
    return { tokens };
  }, [estimator, form.modelPreferred, form.noCodeBlocks, form.noExplanations, form.outputOnlyResult, form.systemPrompt, form.userPrompt]);

  const preview = useMemo(() => {
    if (!validation.ok) return null;
    const def = validation.def;
    const skill = toPromptTemplateSkill(def);
    const immediateContent = `User instruction (preview):\n${def.markdown.userInstruction ?? '(none)'}\n\nText:\n<your text>`;
    const immediate: ContextFragment[] = [
      {
        id: 'immediate:skill-studio:preview',
        layer: 'immediate',
        source: { kind: 'module', id: 'skill-studio' },
        content: immediateContent,
        priority: 100,
        tokenCount: estimator.estimate(immediateContent, form.modelPreferred).tokens,
      },
    ];
    return renderPromptTemplate({ skill, rules: [], settings: [], retrieved: [], immediate });
  }, [estimator, form.modelPreferred, validation]);

  const writeRequest: SkillWriteRequest | null = useMemo(() => {
    const scope = form.scope;
    const projectId = scope === 'project' ? currentProjectId : undefined;
    if (scope === 'project' && !projectId) return null;

    const packageVersion = form.version.trim();
    const skillSlug = form.skillSlug.trim();
    return {
      scope,
      ...(projectId ? { projectId } : {}),
      packageId: form.packageId.trim(),
      packageVersion,
      skillSlug,
      content: generated.text,
      overwrite: props.mode === 'edit',
    };
  }, [currentProjectId, form.packageId, form.scope, form.skillSlug, form.version, generated.text, props.mode]);

  const saveDisabled = saveBusy || loading || !writeRequest || !validation.ok;

  const onSave = async () => {
    if (!writeRequest) return;
    if (!validation.ok) return;
    setSaveBusy(true);
    setError(null);
    try {
      if (props.mode === 'edit' && sourceUri) {
        const derived = deriveWriteTargetFromSourceUri(sourceUri);
        if (derived) {
          await skillOps.write({ ...writeRequest, packageVersion: derived.packageVersion, skillSlug: derived.skillSlug, overwrite: true });
        } else {
          await skillOps.write({ ...writeRequest, overwrite: true });
        }
      } else {
        await skillOps.write(writeRequest);
      }
      await refreshSkills({ includeDisabled: true });
      props.onClose();
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaveBusy(false);
    }
  };

  const title = props.mode === 'edit' ? 'Edit SKILL' : 'New SKILL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div
        style={{ width: 980, maxWidth: '95vw', maxHeight: '92vh' }}
        className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-xl flex flex-col"
      >
        <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="text-[13px] text-[var(--text-primary)] font-medium">{title}</div>
          <button type="button" onClick={props.onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <X className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-3 p-3">
          <div className="space-y-3">
            {loading && <div className="text-[12px] text-[var(--text-tertiary)]">Loading…</div>}
            {error && <div className="text-[12px] text-[var(--danger)]">{error}</div>}

            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Metadata</div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <div className="text-xs text-[var(--text-tertiary)]">Scope</div>
                  <select
                    value={form.scope}
                    disabled={props.mode === 'edit'}
                    onChange={(e) =>
                      setForm((prev) => {
                        const scope = e.target.value === 'project' ? 'project' : 'global';
                        const nextId = prev.id.trim() ? prev.id : inferSkillId(scope, prev.name);
                        return { ...prev, scope, packageId: inferPackageId(scope), id: nextId, skillSlug: inferSkillSlugFromId(nextId) };
                      })
                    }
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1"
                  >
                    <option value="global">Global</option>
                    <option value="project">Project</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <div className="text-xs text-[var(--text-tertiary)]">Version</div>
                  <input
                    value={form.version}
                    disabled={props.mode === 'edit'}
                    onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Skill ID</div>
                  <input
                    value={form.id}
                    disabled={props.mode === 'edit'}
                    onChange={(e) =>
                      setForm((prev) => {
                        const id = e.target.value;
                        return { ...prev, id, skillSlug: inferSkillSlugFromId(id) };
                      })
                    }
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Name</div>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                        ...(props.mode === 'create' && !prev.id.trim() ? { id: inferSkillId(prev.scope, e.target.value), skillSlug: inferSkillSlugFromId(inferSkillId(prev.scope, e.target.value)) } : {}),
                      }))
                    }
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Description</div>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Tags (comma separated)</div>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Package ID</div>
                  <input
                    value={form.packageId}
                    disabled={props.mode === 'edit'}
                    onChange={(e) => setForm((prev) => ({ ...prev, packageId: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Model</div>
                  <input
                    value={form.modelPreferred}
                    onChange={(e) => setForm((prev) => ({ ...prev, modelPreferred: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono"
                  />
                </label>

                <label className="space-y-1 col-span-2">
                  <div className="text-xs text-[var(--text-tertiary)]">Max instruction tokens</div>
                  <input
                    type="number"
                    value={form.maxInstructionTokens}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxInstructionTokens: Number(e.target.value) }))}
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1"
                  />
                </label>
              </div>
            </div>

            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Prompt</div>
              <label className="space-y-1 block">
                <div className="text-xs text-[var(--text-tertiary)]">System prompt</div>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={5}
                  className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono"
                />
              </label>
              <label className="space-y-1 block">
                <div className="text-xs text-[var(--text-tertiary)]">User template</div>
                <textarea
                  value={form.userPrompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, userPrompt: e.target.value }))}
                  rows={8}
                  className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1 font-mono"
                />
              </label>
            </div>

            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Output</div>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input type="checkbox" checked={form.outputOnlyResult} onChange={(e) => setForm((p) => ({ ...p, outputOnlyResult: e.target.checked }))} />
                Output only result
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input type="checkbox" checked={form.noExplanations} onChange={(e) => setForm((p) => ({ ...p, noExplanations: e.target.checked }))} />
                No explanations
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input type="checkbox" checked={form.noCodeBlocks} onChange={(e) => setForm((p) => ({ ...p, noCodeBlocks: e.target.checked }))} />
                No code blocks
              </label>
            </div>

            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Notes</div>
              <label className="space-y-1 block">
                <div className="text-xs text-[var(--text-tertiary)]">Intent (Markdown)</div>
                <textarea
                  value={form.intent}
                  onChange={(e) => setForm((prev) => ({ ...prev, intent: e.target.value }))}
                  rows={4}
                  className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-2 py-1"
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Validation</div>
                <div className="text-xs text-[var(--text-tertiary)]">~{tokenStats.tokens} tokens</div>
              </div>
              {validation.ok ? (
                <div className="text-[12px] text-[var(--text-secondary)]">OK</div>
              ) : (
                <div className="text-[12px] text-[var(--danger)]">{validation.error}</div>
              )}
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Budget: {form.maxInstructionTokens} tokens {tokenStats.tokens > form.maxInstructionTokens ? '(exceeds)' : ''}
              </div>
            </div>

            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">Preview Prompt</div>
              {preview ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">System</div>
                    <pre className="text-xs whitespace-pre-wrap bg-[var(--bg-tertiary)] rounded p-2 max-h-[260px] overflow-auto">{preview.systemPrompt}</pre>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">User</div>
                    <pre className="text-xs whitespace-pre-wrap bg-[var(--bg-tertiary)] rounded p-2 max-h-[260px] overflow-auto">{preview.userContent}</pre>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-[var(--text-tertiary)]">Fix validation errors to see preview.</div>
              )}
            </div>

            <div className="wn-elevated rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">SKILL.md</div>
              <pre className="text-xs whitespace-pre-wrap bg-[var(--bg-tertiary)] rounded p-2 max-h-[420px] overflow-auto">{generated.text}</pre>
            </div>
          </div>
        </div>

        <div className="h-12 flex items-center justify-end gap-2 px-3 border-t border-[var(--border-subtle)] flex-shrink-0">
          <button type="button" onClick={props.onClose} className="px-3 py-1.5 rounded border border-[var(--border-subtle)] text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={saveDisabled}
            onClick={() => onSave().catch(() => undefined)}
            className="px-3 py-1.5 rounded bg-[var(--accent-primary)] text-white text-sm disabled:opacity-50 disabled:pointer-events-none"
            data-testid="skill-studio-save"
          >
            {saveBusy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
