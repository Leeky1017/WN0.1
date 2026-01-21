import { describe, expect, it } from 'vitest';

import type { ContextFragmentInput } from '../../types/context';
import { ContextAssembler } from './assembler';

describe('ContextAssembler', () => {
  it('assembles in layer order and renders stable prefix vs dynamic suffix', async () => {
    const loadRules = async () => {
      const fragments: ContextFragmentInput[] = [
        {
          id: 'rules:style',
          layer: 'rules',
          source: { kind: 'file', path: '.writenow/rules/style.md' },
          content: 'Style rules',
          priority: 100,
          required: true,
        },
      ];
      return { projectId: 'p', rootPath: '/tmp/.writenow', loadedAtMs: 1, fragments, errors: [] };
    };

    const loadSettings = async () => {
      const fragments: ContextFragmentInput[] = [
        {
          id: 'settings:world',
          layer: 'settings',
          source: { kind: 'file', path: '.writenow/settings/world.md' },
          content: 'World setting',
          priority: 10,
        },
      ];
      return { projectId: 'p', rootPath: '/tmp/.writenow', fragments, errors: [] };
    };

    const assembler = new ContextAssembler({ loadRules, loadSettings });

    const userInstruction = 'Please polish the selected text.';
    const result = await assembler.assemble({
      projectId: 'p',
      model: 'test',
      budget: {
        totalLimit: 10_000,
        layerBudgets: { rules: 10_000, settings: 10_000, retrieved: 10_000, immediate: 10_000 },
      },
      skill: { id: 'builtin:polish', name: 'Polish' },
      editorContext: {
        selectedText: 'Hello',
        cursorLine: 1,
        cursorColumn: 1,
        currentParagraph: 'Hello',
        surroundingParagraphs: { before: [], after: [] },
        detectedEntities: [],
      },
      userInstruction,
      settings: { settings: ['world.md'] },
      retrieved: [
        {
          id: 'retrieved:1',
          layer: 'retrieved',
          source: { kind: 'module', id: 'rag' },
          content: 'Retrieved snippet',
          priority: 1,
        },
      ],
    });

    const layers = result.fragments.map((f) => f.layer);
    const firstRules = layers.indexOf('rules');
    const firstSettings = layers.indexOf('settings');
    const firstRetrieved = layers.indexOf('retrieved');
    const firstImmediate = layers.indexOf('immediate');

    expect(firstRules).toBeGreaterThanOrEqual(0);
    expect(firstSettings).toBeGreaterThan(firstRules);
    expect(firstRetrieved).toBeGreaterThan(firstSettings);
    expect(firstImmediate).toBeGreaterThan(firstRetrieved);

    expect(result.messages.length).toBe(2);
    expect(result.systemPrompt).toContain('# Skill');
    expect(result.systemPrompt).toContain('# Rules');
    expect(result.userContent).toContain('# Context (dynamic)');
    expect(result.systemPrompt).not.toContain(userInstruction);
    expect(result.userContent).toContain(userInstruction);
  });
});

