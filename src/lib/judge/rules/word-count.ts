import type { ConstraintRule, ConstraintViolation } from '../types';

type WordCountConfig = {
  min?: number;
  max?: number;
};

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function countWords(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function getConfig(rule: ConstraintRule): WordCountConfig | null {
  const min = asFiniteNumber(rule.config.min);
  const max = asFiniteNumber(rule.config.max);
  if (typeof min !== 'number' && typeof max !== 'number') return null;
  return {
    min: typeof min === 'number' && min >= 0 ? Math.floor(min) : undefined,
    max: typeof max === 'number' && max >= 0 ? Math.floor(max) : undefined,
  };
}

export function checkWordCount(text: string, rule: ConstraintRule): ConstraintViolation[] {
  const config = getConfig(rule);
  if (!config) return [];

  const value = countWords(text);
  const min = config.min;
  const max = config.max;

  if (typeof min === 'number' && value < min) {
    return [
      {
        ruleId: rule.id,
        type: rule.type,
        level: rule.level,
        message: `字数不足：当前 ${value}，最少 ${min}`,
        suggestion: `扩写到至少 ${min} 字`,
      },
    ];
  }

  if (typeof max === 'number' && value > max) {
    return [
      {
        ruleId: rule.id,
        type: rule.type,
        level: rule.level,
        message: `字数超标：当前 ${value}，最多 ${max}`,
        suggestion: `精简到 ${max} 字以内`,
      },
    ];
  }

  return [];
}
