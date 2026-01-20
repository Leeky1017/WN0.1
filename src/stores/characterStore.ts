import { create } from 'zustand';

import { IpcError, characterOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

import type { Character, JsonValue } from '../types/models';

type CharacterDraft = {
  name: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
};

type CharacterPatch = {
  id: string;
  name?: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
};

type CharacterState = {
  characters: Character[];
  selectedCharacterId: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectCharacter: (id: string | null) => void;
  createCharacter: (draft: CharacterDraft) => Promise<Character | null>;
  updateCharacter: (patch: CharacterPatch) => Promise<Character | null>;
  deleteCharacter: (id: string) => Promise<void>;
};

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getCurrentProjectId() {
  return useProjectsStore.getState().currentProjectId;
}

function pickSelected(characters: Character[], selectedId: string | null) {
  if (!selectedId) return null;
  return characters.some((c) => c.id === selectedId) ? selectedId : null;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  selectedCharacterId: null,
  isLoading: false,
  hasLoaded: false,
  error: null,

  refresh: async () => {
    const projectId = getCurrentProjectId();
    if (!projectId) {
      set({ characters: [], selectedCharacterId: null, hasLoaded: true, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { characters } = await characterOps.list(projectId);
      set({
        characters,
        selectedCharacterId: pickSelected(characters, get().selectedCharacterId),
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  selectCharacter: (id: string | null) => {
    const nextId = typeof id === 'string' ? id.trim() : '';
    set({ selectedCharacterId: nextId || null });
  },

  createCharacter: async (draft: CharacterDraft) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return null;

    set({ isLoading: true, error: null });
    try {
      const created = await characterOps.create({
        projectId,
        name: draft.name,
        description: draft.description,
        traits: draft.traits,
        relationships: draft.relationships,
      });
      await get().refresh();
      set({ selectedCharacterId: created.character.id });
      return created.character;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  updateCharacter: async (patch: CharacterPatch) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return null;

    set({ isLoading: true, error: null });
    try {
      const updated = await characterOps.update({
        projectId,
        id: patch.id,
        name: patch.name,
        description: patch.description,
        traits: patch.traits,
        relationships: patch.relationships,
      });
      await get().refresh();
      return updated.character;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  deleteCharacter: async (id: string) => {
    const projectId = getCurrentProjectId();
    const targetId = typeof id === 'string' ? id.trim() : '';
    if (!projectId || !targetId) return;

    set({ isLoading: true, error: null });
    try {
      await characterOps.delete({ projectId, id: targetId });
      await get().refresh();
      if (get().selectedCharacterId === targetId) {
        set({ selectedCharacterId: null });
      }
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },
}));

