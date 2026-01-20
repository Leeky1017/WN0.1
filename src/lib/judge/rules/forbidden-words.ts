import type { ConstraintRule, ConstraintViolation } from '../types';

type ForbiddenWordsConfig = {
  words: string[];
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item : String(item))).map((item) => item.trim()).filter(Boolean);
}

function getConfig(rule: ConstraintRule): ForbiddenWordsConfig | null {
  const words = asStringArray(rule.config.words);
  if (words.length === 0) return null;
  const unique = Array.from(new Set(words));
  return { words: unique };
}

export function checkForbiddenWords(text: string, rule: ConstraintRule): ConstraintViolation[] {
  const config = getConfig(rule);
  if (!config) return [];

  const matches: Array<{ start: number; end: number; word: string }> = [];
  for (const word of config.words) {
    let idx = 0;
    while (idx <= text.length) {
      const found = text.indexOf(word, idx);
      if (found === -1) break;
      matches.push({ start: found, end: found + word.length, word });
      idx = found + 1;
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end || a.word.localeCompare(b.word));

  const seen = new Set<string>();
  const violations: ConstraintViolation[] = [];
  for (const match of matches) {
    const key = `${match.word}:${match.start}:${match.end}`;
    if (seen.has(key)) continue;
    seen.add(key);

    violations.push({
      ruleId: rule.id,
      type: rule.type,
      level: rule.level,
      message: `包含禁用词：「${match.word}」`,
      position: { start: match.start, end: match.end },
    });
  }

  return violations;
}
