import type { ContextFragment, ContextLayer } from '../../types/context';

export type PromptTemplateSkill = {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  outputConstraints?: string[];
  outputFormat?: string;
};

const PROMPT_TEMPLATE_VERSION = '1' as const;

function formatSource(source: ContextFragment['source']): string {
  if (source.kind === 'file') return source.path;
  if (source.kind === 'module') return `module:${source.id}`;
  return `conversation:${source.id} (${source.path})`;
}

function formatLayerHeading(layer: ContextLayer): string {
  if (layer === 'rules') return 'Rules';
  if (layer === 'settings') return 'Settings';
  if (layer === 'retrieved') return 'Retrieved';
  return 'Immediate';
}

function stableRuleSortKey(fragment: ContextFragment): { order: number; path: string; id: string } {
  if (fragment.source.kind !== 'file') {
    return { order: 99, path: formatSource(fragment.source), id: fragment.id };
  }
  const path = fragment.source.path.replaceAll('\\', '/');
  if (path.endsWith('rules/style.md')) return { order: 1, path, id: fragment.id };
  if (path.endsWith('rules/terminology.json')) return { order: 2, path, id: fragment.id };
  if (path.endsWith('rules/constraints.json')) return { order: 3, path, id: fragment.id };
  return { order: 50, path, id: fragment.id };
}

function stableSortRules(fragments: ContextFragment[]) {
  const list = Array.isArray(fragments) ? fragments : [];
  return [...list].sort((a, b) => {
    const ak = stableRuleSortKey(a);
    const bk = stableRuleSortKey(b);
    if (ak.order !== bk.order) return ak.order - bk.order;
    if (ak.path !== bk.path) return ak.path.localeCompare(bk.path);
    return ak.id.localeCompare(bk.id);
  });
}

function renderFragmentBlock(fragment: ContextFragment): string {
  const header = `- Source: ${formatSource(fragment.source)}`;
  const body = fragment.content.trim();
  return body ? `${header}\n${body}` : header;
}

export function renderPromptTemplate(input: {
  skill: PromptTemplateSkill;
  rules: ContextFragment[];
  settings: ContextFragment[];
  retrieved: ContextFragment[];
  immediate: ContextFragment[];
}): { systemPrompt: string; userContent: string; templateVersion: string } {
  const stableRules = stableSortRules(input.rules);

  const systemParts: string[] = [];
  systemParts.push('# PromptTemplate');
  systemParts.push(`- version: ${PROMPT_TEMPLATE_VERSION}`);

  systemParts.push('\n# Identity');
  systemParts.push('You are WriteNow, a careful writing assistant for creators.');
  systemParts.push('Follow the skill definition, output constraints, and project rules strictly.');

  systemParts.push('\n# Skill');
  systemParts.push(`- id: ${input.skill.id}`);
  systemParts.push(`- name: ${input.skill.name}`);
  if (input.skill.description?.trim()) systemParts.push(`- description: ${input.skill.description.trim()}`);
  if (input.skill.systemPrompt?.trim()) {
    systemParts.push('\n## System Prompt');
    systemParts.push(input.skill.systemPrompt.trim());
  }

  const constraints = Array.isArray(input.skill.outputConstraints)
    ? Array.from(new Set(input.skill.outputConstraints.map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      )
    : [];
  const outputFormat = typeof input.skill.outputFormat === 'string' ? input.skill.outputFormat.trim() : '';

  systemParts.push('\n# Output');
  if (outputFormat) systemParts.push(`- format: ${outputFormat}`);
  if (constraints.length === 0) {
    systemParts.push('- constraints: (none)');
  } else {
    systemParts.push('- constraints:');
    for (const c of constraints) systemParts.push(`  - ${c}`);
  }

  systemParts.push(`\n# ${formatLayerHeading('rules')}`);
  if (stableRules.length === 0) {
    systemParts.push('- (no rules loaded)');
  } else {
    for (const frag of stableRules) {
      systemParts.push(renderFragmentBlock(frag));
      systemParts.push('');
    }
  }

  const userParts: string[] = [];
  userParts.push('# Context (dynamic)');

  const dynamicSections: Array<{ layer: ContextLayer; title: string; fragments: ContextFragment[] }> = [
    { layer: 'settings', title: formatLayerHeading('settings'), fragments: input.settings },
    { layer: 'retrieved', title: formatLayerHeading('retrieved'), fragments: input.retrieved },
    { layer: 'immediate', title: formatLayerHeading('immediate'), fragments: input.immediate },
  ];

  for (const section of dynamicSections) {
    userParts.push(`\n## ${section.title}`);
    if (section.fragments.length === 0) {
      userParts.push('- (empty)');
      continue;
    }
    for (const frag of section.fragments) {
      userParts.push(renderFragmentBlock(frag));
      userParts.push('');
    }
  }

  return {
    systemPrompt: systemParts.join('\n').trimEnd(),
    userContent: userParts.join('\n').trimEnd(),
    templateVersion: PROMPT_TEMPLATE_VERSION,
  };
}
