import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useCharacterStore } from '../../stores/characterStore';
import { useProjectsStore } from '../../stores/projectsStore';

import { CharacterList } from './CharacterList';
import { CharacterDetail } from './CharacterDetail';
import type { RelationshipItem, Trait } from './types';

import type { Character } from '../../types/models';

function useSelectedCharacter(characters: Character[], selectedId: string | null) {
  return useMemo(() => {
    if (!selectedId) return null;
    return characters.find((c) => c.id === selectedId) ?? null;
  }, [characters, selectedId]);
}

export function CharactersPanel() {
  const { t } = useTranslation();
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);
  const characters = useCharacterStore((s) => s.characters);
  const selectedId = useCharacterStore((s) => s.selectedCharacterId);
  const isLoading = useCharacterStore((s) => s.isLoading);
  const error = useCharacterStore((s) => s.error);
  const refresh = useCharacterStore((s) => s.refresh);
  const selectCharacter = useCharacterStore((s) => s.selectCharacter);
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const deleteCharacter = useCharacterStore((s) => s.deleteCharacter);

  const selected = useSelectedCharacter(characters, selectedId);

  const defaultName = t('characters.create.defaultName');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState(() => defaultName);
  const [createError, setCreateError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh, currentProjectId]);

  const openCreate = () => {
    setCreateError(null);
    setCreateName(defaultName);
    setCreateOpen(true);
    window.setTimeout(() => {
      createInputRef.current?.focus();
      createInputRef.current?.select();
    }, 0);
  };

  const submitCreate = async () => {
    setCreateError(null);
    const name = createName.trim() || defaultName;
    const created = await createCharacter({ name, traits: [], relationships: [] });
    if (!created) {
      setCreateError(useCharacterStore.getState().error ?? t('characters.errors.createFailed'));
      return;
    }
    setCreateOpen(false);
    selectCharacter(created.id);
  };

  const openDelete = () => {
    if (!selected) return;
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const submitDelete = async () => {
    if (!selected) return;
    setDeleteError(null);
    await deleteCharacter(selected.id);
    const nextError = useCharacterStore.getState().error;
    if (nextError) {
      setDeleteError(nextError);
      return;
    }
    setDeleteOpen(false);
  };

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('nav.characters')}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openDelete}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            title={t('characters.actions.deleteTitle')}
            disabled={!selected || isLoading}
          >
            <Trash2 className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title={t('characters.actions.createTitle')}
            disabled={!currentProjectId || isLoading}
          >
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-3 text-[12px] text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
          <div className="mb-2">{t('characters.errors.loadFailed', { error })}</div>
          <button
            type="button"
            onClick={() => refresh().catch(() => undefined)}
            className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <CharacterList characters={characters} selectedId={selectedId} onSelect={selectCharacter} />
        <CharacterDetail
          key={selected?.id ?? 'none'}
          character={selected}
          isBusy={isLoading}
          onSave={async (input: { id: string; name: string; description: string; traits: Trait[]; relationships: RelationshipItem[] }) => {
            await updateCharacter({
              id: input.id,
              name: input.name,
              description: input.description,
              traits: input.traits,
              relationships: input.relationships,
            });
            const nextError = useCharacterStore.getState().error;
            if (nextError) throw new Error(nextError);
          }}
        />
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={() => setCreateOpen(false)}>
          <div className="wn-elevated p-5 w-[380px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">{t('characters.create.dialogTitle')}</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('characters.create.dialogDescription')}</div>
            <input
              ref={createInputRef}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate().catch(() => undefined);
                if (e.key === 'Escape') setCreateOpen(false);
              }}
              className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              placeholder={defaultName}
              spellCheck={false}
            />
            {createError && <div className="mt-2 text-[12px] text-red-400">{createError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => submitCreate().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={() => setDeleteOpen(false)}>
          <div className="wn-elevated p-5 w-[420px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-2">{t('characters.delete.dialogTitle')}</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
              {t('characters.delete.confirm', { name: selected.name })}
            </div>
            {deleteError && <div className="mb-3 text-[12px] text-red-400">{deleteError}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => submitDelete().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-red-500/80 hover:bg-red-500 rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {t('common.delete')}
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
