import type { ContextFragment, ContextLayer } from '../../types/context';

export type PromptTemplateSkill = {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
};

function stableSortFragments(fragments: ContextFragment[]) {
  return [...fragments].sort((a, b) => a.id.localeCompare(b.id));
}

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
}): { systemPrompt: string; userContent: string } {
  const stableRules = stableSortFragments(input.rules);

  const systemParts: string[] = [];
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
  };
}
