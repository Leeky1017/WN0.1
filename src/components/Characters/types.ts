import type { JsonValue } from '../../types/models';

export type Trait = string;

export type RelationshipItem = {
  target: string;
  type: string;
  note?: string;
};

export function toTraitList(value: JsonValue | undefined): Trait[] {
  if (!Array.isArray(value)) return [];
  const items: Trait[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    items.push(trimmed);
  }
  return Array.from(new Set(items));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function toRelationshipList(value: JsonValue | undefined): RelationshipItem[] {
  if (!Array.isArray(value)) return [];
  const items: RelationshipItem[] = [];
  for (const raw of value) {
    if (!isPlainObject(raw)) continue;
    const target = typeof raw.target === 'string' ? raw.target.trim() : '';
    const type = typeof raw.type === 'string' ? raw.type.trim() : '';
    const note = typeof raw.note === 'string' ? raw.note.trim() : '';
    if (!target || !type) continue;
    items.push({
      target,
      type,
      note: note || undefined,
    });
  }
  return items;
}

export function normalizeRelationshipList(items: RelationshipItem[]): RelationshipItem[] {
  const normalized: RelationshipItem[] = [];
  for (const item of items) {
    const target = item.target.trim();
    const type = item.type.trim();
    const note = (item.note ?? '').trim();
    if (!target || !type) continue;
    normalized.push({
      target,
      type,
      note: note || undefined,
    });
  }
  return normalized;
}

