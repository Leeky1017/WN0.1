import { describe, expect, it } from 'vitest';

import { detectEntities } from './entity-detect';

describe('detectEntities (phase 1)', () => {
  it('prefers longest overlapping CJK matches to avoid partial mis-detect', () => {
    const res = detectEntities({
      context: {
        selectedText: '张三丰走进屋里',
        cursorLine: 1,
        cursorColumn: 1,
        currentParagraph: '',
        surroundingParagraphs: { before: [], after: [] },
        detectedEntities: [],
      },
      candidates: { characters: ['张三.md', '张三丰.md'], settings: [] },
    });

    expect(res.entities).toEqual(['张三丰']);
    expect(res.hits).toEqual([
      { entity: '张三丰', kind: 'person', ruleId: 'settings-index:characters', source: 'selectedText' },
    ]);
  });

  it('avoids ASCII partial matches via word boundary', () => {
    const res = detectEntities({
      context: {
        selectedText: 'Annex',
        cursorLine: 1,
        cursorColumn: 1,
        currentParagraph: '',
        surroundingParagraphs: { before: [], after: [] },
        detectedEntities: [],
      },
      candidates: { characters: ['Ann.md'], settings: [] },
    });

    expect(res.entities).toEqual([]);
    expect(res.hits).toEqual([]);
  });

  it('matches ASCII entities case-insensitively', () => {
    const res = detectEntities({
      context: {
        selectedText: 'ALICE',
        cursorLine: 1,
        cursorColumn: 1,
        currentParagraph: '',
        surroundingParagraphs: { before: [], after: [] },
        detectedEntities: [],
      },
      candidates: { characters: ['Alice.md'], settings: [] },
    });

    expect(res.entities).toEqual(['Alice']);
  });

  it('keeps hit order stable by source priority', () => {
    const res = detectEntities({
      context: {
        selectedText: 'Alice',
        cursorLine: 1,
        cursorColumn: 1,
        currentParagraph: 'Alice is here',
        surroundingParagraphs: { before: ['Alice'], after: [] },
        detectedEntities: [],
      },
      candidates: { characters: ['Alice.md'], settings: [] },
    });

    const sources = res.hits.filter((h) => h.entity === 'Alice').map((h) => h.source);
    expect(sources).toEqual(['selectedText', 'currentParagraph', 'surrounding']);
  });
});

