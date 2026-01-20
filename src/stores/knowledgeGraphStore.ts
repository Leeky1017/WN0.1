import { create } from 'zustand';

import { IpcError, knowledgeGraphOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { useProjectsStore } from './projectsStore';

import type { JsonValue, KnowledgeGraphEntity, KnowledgeGraphRelation } from '../types/models';

type EntityDraft = {
  type: string;
  name: string;
  description?: string;
  metadata?: JsonValue;
};

type EntityPatch = {
  id: string;
  type?: string;
  name?: string;
  description?: string;
  metadata?: JsonValue;
};

type RelationDraft = {
  fromEntityId: string;
  toEntityId: string;
  type: string;
  metadata?: JsonValue;
};

type KnowledgeGraphState = {
  entities: KnowledgeGraphEntity[];
  relations: KnowledgeGraphRelation[];
  selectedEntityId: string | null;
  selectedRelationId: string | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectEntity: (id: string | null) => void;
  selectRelation: (id: string | null) => void;
  createEntity: (draft: EntityDraft) => Promise<KnowledgeGraphEntity | null>;
  updateEntity: (patch: EntityPatch) => Promise<KnowledgeGraphEntity | null>;
  deleteEntity: (id: string) => Promise<void>;
  createRelation: (draft: RelationDraft) => Promise<KnowledgeGraphRelation | null>;
  deleteRelation: (id: string) => Promise<void>;
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

function pickSelectedId<T extends { id: string }>(items: T[], selectedId: string | null) {
  if (!selectedId) return null;
  return items.some((item) => item.id === selectedId) ? selectedId : null;
}

export const useKnowledgeGraphStore = create<KnowledgeGraphState>((set, get) => ({
  entities: [],
  relations: [],
  selectedEntityId: null,
  selectedRelationId: null,
  isLoading: false,
  hasLoaded: false,
  error: null,

  refresh: async () => {
    const projectId = getCurrentProjectId();
    if (!projectId) {
      set({
        entities: [],
        relations: [],
        selectedEntityId: null,
        selectedRelationId: null,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { entities, relations } = await knowledgeGraphOps.getGraph({ projectId });
      set({
        entities,
        relations,
        selectedEntityId: pickSelectedId(entities, get().selectedEntityId),
        selectedRelationId: pickSelectedId(relations, get().selectedRelationId),
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  selectEntity: (id: string | null) => {
    const next = typeof id === 'string' ? id.trim() : '';
    set({ selectedEntityId: next || null, selectedRelationId: null });
  },

  selectRelation: (id: string | null) => {
    const next = typeof id === 'string' ? id.trim() : '';
    set({ selectedRelationId: next || null, selectedEntityId: null });
  },

  createEntity: async (draft: EntityDraft) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return null;

    set({ isLoading: true, error: null });
    try {
      const created = await knowledgeGraphOps.createEntity({
        projectId,
        type: draft.type,
        name: draft.name,
        description: draft.description,
        metadata: draft.metadata,
      });
      await get().refresh();
      set({ selectedEntityId: created.entity.id, selectedRelationId: null });
      return created.entity;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  updateEntity: async (patch: EntityPatch) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return null;

    set({ isLoading: true, error: null });
    try {
      const updated = await knowledgeGraphOps.updateEntity({
        projectId,
        id: patch.id,
        type: patch.type,
        name: patch.name,
        description: patch.description,
        metadata: patch.metadata,
      });
      await get().refresh();
      return updated.entity;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  deleteEntity: async (id: string) => {
    const projectId = getCurrentProjectId();
    const targetId = typeof id === 'string' ? id.trim() : '';
    if (!projectId || !targetId) return;

    set({ isLoading: true, error: null });
    try {
      await knowledgeGraphOps.deleteEntity({ projectId, id: targetId });
      await get().refresh();
      if (get().selectedEntityId === targetId) set({ selectedEntityId: null });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },

  createRelation: async (draft: RelationDraft) => {
    const projectId = getCurrentProjectId();
    if (!projectId) return null;

    set({ isLoading: true, error: null });
    try {
      const created = await knowledgeGraphOps.createRelation({
        projectId,
        fromEntityId: draft.fromEntityId,
        toEntityId: draft.toEntityId,
        type: draft.type,
        metadata: draft.metadata,
      });
      await get().refresh();
      set({ selectedRelationId: created.relation.id, selectedEntityId: null });
      return created.relation;
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
      return null;
    }
  },

  deleteRelation: async (id: string) => {
    const projectId = getCurrentProjectId();
    const targetId = typeof id === 'string' ? id.trim() : '';
    if (!projectId || !targetId) return;

    set({ isLoading: true, error: null });
    try {
      await knowledgeGraphOps.deleteRelation({ projectId, id: targetId });
      await get().refresh();
      if (get().selectedRelationId === targetId) set({ selectedRelationId: null });
    } catch (error) {
      set({ isLoading: false, hasLoaded: true, error: toErrorMessage(error) });
    }
  },
}));

