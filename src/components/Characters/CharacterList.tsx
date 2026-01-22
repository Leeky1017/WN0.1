import React, { useMemo, useState } from 'react';
import { Search, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Character } from '../../types/models';

interface CharacterListProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function summarize(text: string, max = 36) {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export function CharacterList({ characters, selectedId, onSelect }: CharacterListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return characters;
    return characters.filter((c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q));
  }, [characters, query]);

  return (
    <div className="w-[180px] border-r border-[var(--border-subtle)] flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded px-2 py-1">
          <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('characters.list.searchPlaceholder')}
            className="bg-transparent outline-none text-[12px] flex-1 text-[var(--text-secondary)] placeholder-[var(--text-tertiary)]"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <div className="text-[12px] text-[var(--text-tertiary)] mb-1">{t('characters.list.empty.title')}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{t('characters.list.empty.hint')}</div>
          </div>
        ) : (
          filtered.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  active ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[var(--text-secondary)] truncate">{c.name}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">{summarize(c.description ?? '')}</div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
