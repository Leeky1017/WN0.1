/**
 * Skill prompt template rendering
 * Why: The AI backend expects fully materialized prompt strings (`prompt.systemPrompt`, `prompt.userContent`).
 * Skill definitions store Mustache-like templates (e.g. `{{text}}`, `{{#context}}...{{/context}}`).
 */

import type { SkillFileDefinition } from '@/types/ipc-generated';

type PromptTemplate = { system: string; user: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getPromptTemplate(definition: SkillFileDefinition | undefined): PromptTemplate | null {
  if (!definition) return null;
  const fm = definition.frontmatter;
  if (!isRecord(fm)) return null;

  const prompt = fm['prompt'];
  if (!isRecord(prompt)) return null;

  const system = prompt['system'];
  const user = prompt['user'];
  if (typeof system !== 'string' || typeof user !== 'string') return null;
  return { system, user };
}

function renderSections(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{#([a-zA-Z0-9_]+)}}([\s\S]*?){{\/\1}}/g, (_m, rawKey, body) => {
    const key = String(rawKey);
    const value = vars[key];
    if (!value || !value.trim()) return '';
    return body;
  });
}

function renderVariables(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, rawKey) => {
    const key = String(rawKey);
    const value = vars[key];
    return typeof value === 'string' ? value : '';
  });
}

export type SkillPromptInput = {
  text: string;
  context?: string;
  styleGuide?: string;
};

export type RenderedPrompt = {
  systemPrompt: string;
  userContent: string;
};

export function renderSkillPrompt(definition: SkillFileDefinition | undefined, input: SkillPromptInput): RenderedPrompt {
  const prompt = getPromptTemplate(definition);
  if (!prompt) {
    throw new Error('Skill prompt template is missing');
  }

  const vars: Record<string, string | undefined> = {
    text: input.text,
    context: input.context,
    styleGuide: input.styleGuide,
  };

  const systemPrompt = renderVariables(renderSections(prompt.system, vars), vars).trim();
  const userContent = renderVariables(renderSections(prompt.user, vars), vars).trim();

  if (!systemPrompt) throw new Error('Rendered systemPrompt is empty');
  if (!userContent) throw new Error('Rendered userContent is empty');

  return { systemPrompt, userContent };
}

