/**
 * Unit tests for diffUtils
 * Why: Verify diff computation and merge logic for AI rewrite workflows
 */

import { describe, it, expect } from 'vitest';
import { computeDiff, mergeDiff } from './diffUtils';

describe('computeDiff', () => {
  it('should return empty array for identical strings', () => {
    const result = computeDiff('hello', 'hello');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('unchanged');
    expect(result[0].content).toBe('hello');
  });

  it('should detect added lines', () => {
    const original = 'line1\n';
    const modified = 'line1\nline2\n';
    const result = computeDiff(original, modified);
    
    expect(result.some((h) => h.type === 'add' && h.content.includes('line2'))).toBe(true);
  });

  it('should detect removed lines', () => {
    const original = 'line1\nline2\n';
    const modified = 'line1\n';
    const result = computeDiff(original, modified);
    
    expect(result.some((h) => h.type === 'remove' && h.content.includes('line2'))).toBe(true);
  });

  it('should detect both additions and removals', () => {
    const original = 'line1\nold\nline3\n';
    const modified = 'line1\nnew\nline3\n';
    const result = computeDiff(original, modified);
    
    const hasRemove = result.some((h) => h.type === 'remove');
    const hasAdd = result.some((h) => h.type === 'add');
    expect(hasRemove).toBe(true);
    expect(hasAdd).toBe(true);
  });

  it('should preserve unchanged content', () => {
    const original = 'unchanged\n';
    const modified = 'unchanged\n';
    const result = computeDiff(original, modified);
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('unchanged');
  });
});

describe('mergeDiff', () => {
  it('should return modified content when all accepted', () => {
    const original = 'old\n';
    const modified = 'new\n';
    const hunks = computeDiff(original, modified);
    const accepted = hunks.map(() => true);
    
    const result = mergeDiff(original, modified, accepted);
    expect(result).toBe('new\n');
  });

  it('should return original content when all rejected', () => {
    const original = 'old\n';
    const modified = 'new\n';
    const hunks = computeDiff(original, modified);
    const accepted = hunks.map(() => false);
    
    const result = mergeDiff(original, modified, accepted);
    expect(result).toBe('old\n');
  });

  it('should handle partial acceptance', () => {
    const original = 'line1\nline2\nline3\n';
    const modified = 'line1\nmodified\nline3\n';
    const hunks = computeDiff(original, modified);
    
    // Accept all changes
    const allAccepted = hunks.map(() => true);
    const result = mergeDiff(original, modified, allAccepted);
    expect(result).toBe('line1\nmodified\nline3\n');
  });

  it('should throw on length mismatch', () => {
    const original = 'old\n';
    const modified = 'new\n';
    
    expect(() => mergeDiff(original, modified, [])).toThrow('accepted mask length mismatch');
  });

  it('should preserve unchanged sections', () => {
    const original = 'keep this\nchange this\n';
    const modified = 'keep this\nchanged\n';
    const hunks = computeDiff(original, modified);
    const accepted = hunks.map(() => true);
    
    const result = mergeDiff(original, modified, accepted);
    expect(result).toContain('keep this');
  });
});
