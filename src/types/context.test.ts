import { describe, expect, it } from 'vitest';

import type { AssembleResult, ContextFragment, ContextLayer, TokenStats } from './context';

describe('context types', () => {
  it('should typecheck basic shapes', () => {
    const layer: ContextLayer = 'rules';
    expect(layer).toBe('rules');

    const tokenStats: TokenStats = {
      total: { used: 0, limit: 1 },
      layers: {
        rules: { used: 0, budget: 0 },
        settings: { used: 0, budget: 0 },
        retrieved: { used: 0, budget: 0 },
        immediate: { used: 0, budget: 0 },
      },
      estimated: true,
    };

    const fragment: ContextFragment = {
      id: 'x',
      layer: 'rules',
      source: { kind: 'module', id: 'test' },
      content: 'hello',
      tokenCount: 1,
      priority: 1,
    };

    const result: AssembleResult = {
      systemPrompt: '',
      userContent: '',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: '' },
      ],
      fragments: [fragment],
      tokenStats,
      budgetEvidence: null,
    };

    expect(result.fragments[0].layer).toBe(layer);
  });
});

