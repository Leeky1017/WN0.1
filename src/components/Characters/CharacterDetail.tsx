import React, { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Character } from '../../types/models';
import { normalizeRelationshipList, toRelationshipList, toTraitList } from './types';
import type { RelationshipItem, Trait } from './types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface CharacterDetailProps {
  character: Character | null;
  isBusy: boolean;
  onSave: (input: {
    id: string;
    name: string;
    description: string;
    traits: Trait[];
    relationships: RelationshipItem[];
  }) => Promise<void>;
}

function normalizeTraits(traits: Trait[]) {
  const cleaned = traits.map((t) => t.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

export function CharacterDetail({ character, isBusy, onSave }: CharacterDetailProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(() => character?.name ?? '');
  const [description, setDescription] = useState(() => character?.description ?? '');
  const [traitInput, setTraitInput] = useState('');
  const [traits, setTraits] = useState<Trait[]>(() => (character ? toTraitList(character.traits) : []));
  const [relationships, setRelationships] = useState<RelationshipItem[]>(() =>
    character ? toRelationshipList(character.relationships) : []
  );

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    if (!character) return false;
    if (!name.trim()) return false;
    return true;
  }, [character, name]);

  const addTrait = () => {
    const raw = traitInput.trim();
    if (!raw) return;
    setTraits((prev) => normalizeTraits([...prev, raw]));
    setTraitInput('');
  };

  const removeTrait = (trait: string) => {
    setTraits((prev) => prev.filter((t) => t !== trait));
  };

  const addRelationship = () => {
    setRelationships((prev) => [...prev, { target: '', type: '', note: '' }]);
  };

  const updateRelationship = (idx: number, patch: Partial<RelationshipItem>) => {
    setRelationships((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeRelationship = (idx: number) => {
    setRelationships((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitSave = async () => {
    if (!character) return;
    if (!canSave) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      await onSave({
        id: character.id,
        name: name.trim(),
        description: description.trim(),
        traits: normalizeTraits(traits),
        relationships: normalizeRelationshipList(relationships),
      });
      setSaveState('saved');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSaveState('error');
      setSaveError(message);
    }
  };

  if (!character) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-tertiary)] mb-1">{t('characters.detail.empty.title')}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">{t('characters.detail.empty.hint')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[13px] text-[var(--text-primary)] truncate">{character.name}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {saveState === 'saving'
              ? t('editor.save.saving')
              : saveState === 'saved'
                ? t('editor.save.saved')
                : saveState === 'error'
                  ? t('editor.save.error')
                  : ''}
          </div>
        </div>

        <button
          type="button"
          onClick={() => submitSave().catch(() => undefined)}
          disabled={!canSave || isBusy}
          className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[12px] text-white transition-colors disabled:opacity-60"
        >
          {t('common.save')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        <div>
          <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('characters.detail.fields.nameLabel')}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            placeholder={t('characters.detail.fields.namePlaceholder')}
            spellCheck={false}
          />
        </div>

        <div>
          <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('characters.detail.fields.descriptionLabel')}</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[88px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
            placeholder={t('characters.detail.fields.descriptionPlaceholder')}
            spellCheck={false}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] text-[var(--text-tertiary)]">{t('characters.detail.traits.label')}</div>
          </div>
          <div className="flex gap-2">
            <input
              value={traitInput}
              onChange={(e) => setTraitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTrait();
                }
              }}
              className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              placeholder={t('characters.detail.traits.placeholder')}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={addTrait}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors"
              title={t('characters.detail.traits.addTitle')}
            >
              <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          {traits.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {traits.map((trait) => (
                <div
                  key={trait}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]"
                >
                  <span>{trait}</span>
                  <button
                    type="button"
                    onClick={() => removeTrait(trait)}
                    className="w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
                    title={t('common.remove')}
                  >
                    <X className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] text-[var(--text-tertiary)]">{t('characters.detail.relationships.label')}</div>
            <button
              type="button"
              onClick={addRelationship}
              className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {t('common.add')}
            </button>
          </div>

          {relationships.length === 0 ? (
            <div className="text-[11px] text-[var(--text-tertiary)]">{t('characters.detail.relationships.empty')}</div>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel, idx) => (
                <div key={idx} className="p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                  <div className="flex gap-2">
                    <input
                      value={rel.target}
                      onChange={(e) => updateRelationship(idx, { target: e.target.value })}
                      className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                      placeholder={t('characters.detail.relationships.targetPlaceholder')}
                      spellCheck={false}
                    />
                    <input
                      value={rel.type}
                      onChange={(e) => updateRelationship(idx, { type: e.target.value })}
                      className="w-[120px] h-8 px-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                      placeholder={t('characters.detail.relationships.typePlaceholder')}
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => removeRelationship(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </button>
                  </div>
                  <textarea
                    value={rel.note ?? ''}
                    onChange={(e) => updateRelationship(idx, { note: e.target.value })}
                    className="mt-2 w-full min-h-[52px] px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
                    placeholder={t('characters.detail.relationships.notePlaceholder')}
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {saveState === 'error' && saveError && (
          <div className="text-[12px] text-red-400">{saveError}</div>
        )}
      </div>
    </div>
  );
}
