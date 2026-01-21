import type { EditorContext } from '../../types/context';

export type EditorContextSource = 'selectedText' | 'currentParagraph' | 'surrounding';

export type DetectedEntityKind = 'person' | 'place' | 'unknown';

export type DetectedEntityHit = {
  entity: string;
  kind: DetectedEntityKind;
  ruleId: string;
  source: EditorContextSource;
};

export type DetectEntitiesCandidates = {
  characters: string[];
  settings: string[];
};

export type DetectEntitiesResult = {
  entities: string[];
  hits: DetectedEntityHit[];
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

function stripMdExt(fileName: string): string {
  const raw = typeof fileName === 'string' ? fileName.trim() : '';
  if (!raw) return '';
  return raw.replace(/\.md$/i, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAsciiWord(value: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(value);
}

type Candidate = {
  entity: string;
  kind: DetectedEntityKind;
  ruleId: string;
  mode: 'word' | 'substring';
};

function buildCandidates(input: DetectEntitiesCandidates): Candidate[] {
  const candidates: Candidate[] = [];

  for (const raw of Array.isArray(input.characters) ? input.characters : []) {
    const entity = stripMdExt(raw);
    if (!entity) continue;
    candidates.push({
      entity,
      kind: 'person',
      ruleId: 'settings-index:characters',
      mode: isAsciiWord(entity) ? 'word' : 'substring',
    });
  }

  for (const raw of Array.isArray(input.settings) ? input.settings : []) {
    const entity = stripMdExt(raw);
    if (!entity) continue;
    candidates.push({
      entity,
      kind: 'place',
      ruleId: 'settings-index:settings',
      mode: isAsciiWord(entity) ? 'word' : 'substring',
    });
  }

  const deduped = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = `${c.kind}:${c.entity}`;
    if (deduped.has(key)) continue;
    deduped.set(key, c);
  }

  return Array.from(deduped.values()).sort((a, b) => a.entity.localeCompare(b.entity));
}

type Match = {
  start: number;
  end: number;
  candidate: Candidate;
};

function findMatchesInText(text: string, candidate: Candidate): Match[] {
  if (!text) return [];
  if (!candidate.entity) return [];

  if (candidate.mode === 'word') {
    const re = new RegExp(`\\b${escapeRegExp(candidate.entity)}\\b`, 'gi');
    const matches: Match[] = [];
    for (const m of text.matchAll(re)) {
      if (typeof m.index !== 'number') continue;
      matches.push({ start: m.index, end: m.index + m[0].length, candidate });
    }
    return matches;
  }

  const matches: Match[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = text.indexOf(candidate.entity, cursor);
    if (idx === -1) break;
    matches.push({ start: idx, end: idx + candidate.entity.length, candidate });
    cursor = idx + candidate.entity.length;
  }
  return matches;
}

function selectNonOverlappingLongest(matches: Match[]): Match[] {
  const sorted = [...matches].sort((a, b) => {
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;
    if (a.start !== b.start) return a.start - b.start;
    return a.candidate.entity.localeCompare(b.candidate.entity);
  });

  const chosen: Match[] = [];
  for (const next of sorted) {
    const overlaps = chosen.some((c) => !(next.end <= c.start || next.start >= c.end));
    if (overlaps) continue;
    chosen.push(next);
  }

  return chosen.sort((a, b) => (a.start !== b.start ? a.start - b.start : (a.end - a.start) - (b.end - b.start)));
}

function sourcePriority(source: EditorContextSource): number {
  if (source === 'selectedText') return 1;
  if (source === 'currentParagraph') return 2;
  return 3;
}

function stableSortHits(hits: DetectedEntityHit[]): DetectedEntityHit[] {
  return [...hits].sort((a, b) => {
    const sa = sourcePriority(a.source);
    const sb = sourcePriority(b.source);
    if (sa !== sb) return sa - sb;
    const ek = a.entity.localeCompare(b.entity);
    if (ek !== 0) return ek;
    const rk = a.ruleId.localeCompare(b.ruleId);
    if (rk !== 0) return rk;
    return a.kind.localeCompare(b.kind);
  });
}

/**
 * Detects entities from Immediate editor context (Phase 1: string/regex match).
 *
 * Why:
 * - Phase 1 prioritizes deterministic + explainable matching to trigger Settings prefetch safely.
 * - The output must be stable (dedup + deterministic ordering) to avoid noisy prefetch churn.
 */
export function detectEntities(input: { context: EditorContext; candidates: DetectEntitiesCandidates }): DetectEntitiesResult {
  const candidates = buildCandidates(input.candidates);

  const selectedText = normalizeText(input.context.selectedText).trim();
  const currentParagraph = normalizeText(input.context.currentParagraph).trim();
  const surrounding = [...(input.context.surroundingParagraphs?.before ?? []), ...(input.context.surroundingParagraphs?.after ?? [])]
    .map((p) => normalizeText(p).trim())
    .filter(Boolean)
    .join('\n\n');

  const sources: Array<{ source: EditorContextSource; text: string }> = [];
  if (selectedText) sources.push({ source: 'selectedText', text: selectedText });
  if (currentParagraph) sources.push({ source: 'currentParagraph', text: currentParagraph });
  if (surrounding) sources.push({ source: 'surrounding', text: surrounding });

  const hits: DetectedEntityHit[] = [];

  for (const s of sources) {
    const matches: Match[] = [];
    for (const c of candidates) {
      matches.push(...findMatchesInText(s.text, c));
    }

    const kept = selectNonOverlappingLongest(matches);
    const seen = new Set<string>();
    for (const m of kept) {
      const key = `${m.candidate.kind}:${m.candidate.entity}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        entity: m.candidate.entity,
        kind: m.candidate.kind,
        ruleId: m.candidate.ruleId,
        source: s.source,
      });
    }
  }

  const stableHits = stableSortHits(hits);
  const entities = Array.from(new Set(stableHits.map((h) => h.entity))).sort((a, b) => a.localeCompare(b.entity));

  return { entities, hits: stableHits };
}

