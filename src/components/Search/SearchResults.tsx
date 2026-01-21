import React from 'react';

import type { SidebarSearchItem } from '../../hooks/useSearch';

const SNIPPET_HIT_START = '\u0001';
const SNIPPET_HIT_END = '\u0002';

type SnippetSegment = { text: string; isHit: boolean };

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHighlightTokens(query: string) {
  const raw = query.trim();
  if (!raw) return [];
  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/^"(.+)"$/, '$1').replace(/[*]/g, '').trim())
    .filter((t) => t.length > 0)
    .filter((t) => !['AND', 'OR', 'NOT', 'NEAR'].includes(t.toUpperCase()));
  return Array.from(new Set(tokens)).slice(0, 8);
}

function splitByMarkers(text: string): SnippetSegment[] {
  if (!text) return [];
  const segments: SnippetSegment[] = [];
  let buffer = '';
  let inHit = false;

  for (const char of text) {
    if (char === SNIPPET_HIT_START) {
      if (buffer) segments.push({ text: buffer, isHit: inHit });
      buffer = '';
      inHit = true;
      continue;
    }
    if (char === SNIPPET_HIT_END) {
      if (buffer) segments.push({ text: buffer, isHit: inHit });
      buffer = '';
      inHit = false;
      continue;
    }
    buffer += char;
  }

  if (buffer) segments.push({ text: buffer, isHit: inHit });
  return segments;
}

function renderTokenHighlights(text: string, tokens: string[]) {
  if (!text) return null;
  if (tokens.length === 0) return text;
  const pattern = tokens.map(escapeRegExp).join('|');
  if (!pattern) return text;

  const regex = new RegExp(`(${pattern})`, 'ig');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return (
        <mark
          key={`${idx}-${part}`}
          className="bg-[var(--accent-primary)]/25 text-[var(--text-primary)] rounded px-0.5"
        >
          {part}
        </mark>
      );
    }
    return <span key={`${idx}-${part}`}>{part}</span>;
  });
}

type SearchResultsProps = {
  query: string;
  items: SidebarSearchItem[];
  selectedId: string | null;
  onSelect: (id: string) => void | Promise<void>;
};

export function SearchResults({ query, items, selectedId, onSelect }: SearchResultsProps) {
  const tokens = buildHighlightTokens(query);

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const snippetSegments = splitByMarkers(item.snippet);
        const snippetBody =
          snippetSegments.length > 0
            ? snippetSegments.map((seg, idx) =>
                seg.isHit ? (
                  <mark
                    key={`${item.id}-seg-${idx}`}
                    className="bg-[var(--accent-primary)]/25 text-[var(--text-primary)] rounded px-0.5"
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={`${item.id}-seg-${idx}`}>{seg.text}</span>
                ),
              )
            : renderTokenHighlights(item.snippet, tokens);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full text-left px-2.5 py-2 rounded-md transition-colors ${
              isSelected ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
            }`}
            title={item.title}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] text-[var(--text-secondary)] font-medium truncate flex-1 min-w-0">
                {renderTokenHighlights(item.title, tokens)}
              </div>
              {typeof item.score === 'number' && Number.isFinite(item.score) && (
                <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{item.score.toFixed(2)}</div>
              )}
            </div>
            <div className="mt-1 text-[12px] text-[var(--text-tertiary)] leading-snug">{snippetBody}</div>
          </button>
        );
      })}
    </div>
  );
}
