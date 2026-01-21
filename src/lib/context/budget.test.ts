import { describe, expect, it } from 'vitest';

import type { ContextFragmentInput } from '../../types/context';
import { TokenBudgetError, TokenBudgetManager } from './budget';
import { createDefaultTokenEstimator } from './token-estimator';

describe('TokenBudgetManager', () => {
  it('dedupes within a layer and keeps highest priority/required', () => {
    const estimator = createDefaultTokenEstimator();
    const manager = new TokenBudgetManager({
      estimator,
      model: 'test',
      budget: {
        totalLimit: 10_000,
        layerBudgets: { rules: 10_000, settings: 10_000, retrieved: 10_000, immediate: 10_000 },
      },
    });

    const fragments: ContextFragmentInput[] = [
      {
        id: 'a',
        layer: 'retrieved',
        source: { kind: 'module', id: 'x' },
        content: 'hello',
        priority: 1,
      },
      {
        id: 'b',
        layer: 'retrieved',
        source: { kind: 'module', id: 'x' },
        content: 'hello',
        priority: 9,
        required: true,
      },
    ];

    const res = manager.enforce(fragments);
    expect(res.fragments.length).toBe(1);
    expect(res.fragments[0].priority).toBe(9);
    expect(res.fragments[0].required).toBe(true);
  });

  it('removes retrieved first when over total limit', () => {
    const estimator = createDefaultTokenEstimator();
    const manager = new TokenBudgetManager({
      estimator,
      model: 'test',
      budget: {
        totalLimit: 120,
        layerBudgets: { rules: 120, settings: 120, retrieved: 120, immediate: 120 },
      },
    });

    const big = '检索'.repeat(80);
    const res = manager.enforce([
      {
        id: 'rules',
        layer: 'rules',
        source: { kind: 'module', id: 'rules' },
        content: 'style',
        priority: 100,
        required: true,
      },
      {
        id: 'retrieved-low',
        layer: 'retrieved',
        source: { kind: 'module', id: 'r1' },
        content: big,
        priority: 1,
      },
      {
        id: 'retrieved-high',
        layer: 'retrieved',
        source: { kind: 'module', id: 'r2' },
        content: big,
        priority: 9,
      },
      {
        id: 'instruction',
        layer: 'immediate',
        source: { kind: 'module', id: 'inst' },
        content: 'do it',
        priority: 1000,
        required: true,
      },
    ]);

    const removedIds = new Set(res.budgetEvidence?.removed.map((r) => r.fragmentId) ?? []);
    expect(removedIds.has('retrieved-low')).toBe(true);
  });

  it('compresses settings before removing settings when over settings budget', () => {
    const estimator = createDefaultTokenEstimator();
    const manager = new TokenBudgetManager({
      estimator,
      model: 'test',
      budget: {
        totalLimit: 10_000,
        layerBudgets: { rules: 10_000, settings: 200, retrieved: 10_000, immediate: 10_000 },
      },
    });

    const res = manager.enforce([
      {
        id: 'world',
        layer: 'settings',
        source: { kind: 'file', path: '.writenow/settings/world.md' },
        content: '设定'.repeat(800),
        priority: 10,
      },
    ]);

    expect(res.budgetEvidence?.compressed.length).toBeGreaterThanOrEqual(1);
    expect(res.fragments[0].id).toContain('~compressed');
  });

  it('throws when required context exceeds totalLimit', () => {
    const estimator = createDefaultTokenEstimator();
    const manager = new TokenBudgetManager({
      estimator,
      model: 'test',
      budget: {
        totalLimit: 10,
        layerBudgets: { rules: 10, settings: 10, retrieved: 10, immediate: 10 },
      },
    });

    expect(() =>
      manager.enforce([
        {
          id: 'instruction',
          layer: 'immediate',
          source: { kind: 'module', id: 'inst' },
          content: '选区'.repeat(50),
          priority: 1000,
          required: true,
        },
      ]),
    ).toThrow(TokenBudgetError);
  });
});

