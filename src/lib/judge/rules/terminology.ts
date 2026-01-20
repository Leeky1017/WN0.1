import type { ConstraintRule, ConstraintViolation } from '../types';

type TerminologyEntry = {
  canonical: string;
  aliases: string[];
};

type TerminologyConfig = {
  terms: TerminologyEntry[];
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'string' ? item : String(item))).map((item) => item.trim()).filter(Boolean);
}

function getConfig(rule: ConstraintRule): TerminologyConfig | null {
  const rawTerms = rule.config.terms;
  if (!Array.isArray(rawTerms)) return null;

  const terms: TerminologyEntry[] = [];
  for (const term of rawTerms) {
    if (!term || typeof term !== 'object') continue;
    const obj = term as Record<string, unknown>;
    const canonical = typeof obj.canonical === 'string' ? obj.canonical.trim() : '';
    if (!canonical) continue;
    const aliases = asStringArray(obj.aliases).filter((alias) => alias !== canonical);
    if (aliases.length === 0) continue;
    terms.push({ canonical, aliases: Array.from(new Set(aliases)) });
  }

  if (terms.length === 0) return null;
  return { terms };
}

export function checkTerminology(text: string, rule: ConstraintRule): ConstraintViolation[] {
  const config = getConfig(rule);
  if (!config) return [];

  const matches: Array<{ start: number; end: number; alias: string; canonical: string }> = [];
  for (const term of config.terms) {
    for (const alias of term.aliases) {
      let idx = 0;
      while (idx <= text.length) {
        const found = text.indexOf(alias, idx);
        if (found === -1) break;
        matches.push({ start: found, end: found + alias.length, alias, canonical: term.canonical });
        idx = found + 1;
      }
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end || a.alias.localeCompare(b.alias));

  const seen = new Set<string>();
  const violations: ConstraintViolation[] = [];
  for (const match of matches) {
    const key = `${match.alias}:${match.start}:${match.end}:${match.canonical}`;
    if (seen.has(key)) continue;
    seen.add(key);

    violations.push({
      ruleId: rule.id,
      type: rule.type,
      level: rule.level,
      message: `术语不一致：「${match.alias}」应使用「${match.canonical}」`,
      position: { start: match.start, end: match.end },
      suggestion: `替换为「${match.canonical}」`,
    });
  }

  return violations;
}
