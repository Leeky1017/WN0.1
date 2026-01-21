import { describe, expect, it } from 'vitest';

import type { ContextFragment } from '../../types/context';
import { renderPromptTemplate } from './prompt-template';

function frag(input: Omit<ContextFragment, 'tokenCount'> & { tokenCount?: number }): ContextFragment {
  return { ...input, tokenCount: input.tokenCount ?? 1 };
}

describe('renderPromptTemplate', () => {
  it('keeps stable prefix independent of dynamic suffix', () => {
    const rules: ContextFragment[] = [
      frag({
        id: 'rules:constraints',
        layer: 'rules',
        source: { kind: 'file', path: '.writenow/rules/constraints.json' },
        content: 'CONSTRAINTS',
        priority: 1,
      }),
      frag({
        id: 'rules:style',
        layer: 'rules',
        source: { kind: 'file', path: '.writenow/rules/style.md' },
        content: 'STYLE',
        priority: 1,
      }),
      frag({
        id: 'rules:terminology',
        layer: 'rules',
        source: { kind: 'file', path: '.writenow/rules/terminology.json' },
        content: 'TERMS',
        priority: 1,
      }),
    ];

    const first = renderPromptTemplate({
      skill: { id: 'builtin:polish', name: 'Polish' },
      rules,
      settings: [],
      retrieved: [],
      immediate: [frag({ id: 'immediate:a', layer: 'immediate', source: { kind: 'module', id: 'x' }, content: 'DYN_A', priority: 1 })],
    });

    const second = renderPromptTemplate({
      skill: { id: 'builtin:polish', name: 'Polish' },
      rules,
      settings: [],
      retrieved: [],
      immediate: [frag({ id: 'immediate:b', layer: 'immediate', source: { kind: 'module', id: 'y' }, content: 'DYN_B', priority: 1 })],
    });

    expect(first.systemPrompt).toEqual(second.systemPrompt);
    expect(first.systemPrompt).toContain('- version:');
    expect(first.systemPrompt).not.toContain('DYN_A');
    expect(first.systemPrompt).not.toContain('DYN_B');
    expect(first.userContent).not.toEqual(second.userContent);
  });

  it('renders rules in deterministic file order with source trace', () => {
    const rendered = renderPromptTemplate({
      skill: { id: 'builtin:polish', name: 'Polish' },
      rules: [
        frag({
          id: 'rules:constraints',
          layer: 'rules',
          source: { kind: 'file', path: '.writenow/rules/constraints.json' },
          content: 'CONSTRAINTS',
          priority: 1,
        }),
        frag({
          id: 'rules:style',
          layer: 'rules',
          source: { kind: 'file', path: '.writenow/rules/style.md' },
          content: 'STYLE',
          priority: 1,
        }),
      ],
      settings: [],
      retrieved: [],
      immediate: [],
    });

    const posStyle = rendered.systemPrompt.indexOf('.writenow/rules/style.md');
    const posConstraints = rendered.systemPrompt.indexOf('.writenow/rules/constraints.json');
    expect(posStyle).toBeGreaterThanOrEqual(0);
    expect(posConstraints).toBeGreaterThanOrEqual(0);
    expect(posStyle).toBeLessThan(posConstraints);
  });

  it('injects dynamic layers in Settings → Retrieved → Immediate order', () => {
    const rendered = renderPromptTemplate({
      skill: { id: 'builtin:polish', name: 'Polish' },
      rules: [],
      settings: [frag({ id: 's', layer: 'settings', source: { kind: 'module', id: 's' }, content: 'S', priority: 1 })],
      retrieved: [frag({ id: 'r', layer: 'retrieved', source: { kind: 'module', id: 'r' }, content: 'R', priority: 1 })],
      immediate: [frag({ id: 'i', layer: 'immediate', source: { kind: 'module', id: 'i' }, content: 'I', priority: 1 })],
    });

    const settingsPos = rendered.userContent.indexOf('## Settings');
    const retrievedPos = rendered.userContent.indexOf('## Retrieved');
    const immediatePos = rendered.userContent.indexOf('## Immediate');
    expect(settingsPos).toBeGreaterThanOrEqual(0);
    expect(retrievedPos).toBeGreaterThanOrEqual(0);
    expect(immediatePos).toBeGreaterThanOrEqual(0);
    expect(settingsPos).toBeLessThan(retrievedPos);
    expect(retrievedPos).toBeLessThan(immediatePos);
  });
});

