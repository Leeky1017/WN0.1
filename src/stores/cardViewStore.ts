import { create } from 'zustand';

export type CardStatus = 'draft' | 'review' | 'done';

export type CardViewProjectState = {
  order: string[];
  statusById: Record<string, CardStatus>;
  scrollTop: number;
};

type PersistedCardViewStateV1 = {
  version: 1;
  byProject: Record<string, CardViewProjectState>;
};

type CardViewState = {
  isHydrated: boolean;
  byProject: Record<string, CardViewProjectState>;

  hydrate: () => void;
  getProjectState: (projectId: string | null) => CardViewProjectState;
  syncOrder: (projectId: string | null, ids: string[]) => void;
  moveCard: (projectId: string | null, draggedId: string, overId: string) => void;
  setStatus: (projectId: string | null, id: string, status: CardStatus) => void;
  setScrollTop: (projectId: string | null, scrollTop: number) => void;
};

const CARD_VIEW_STORAGE_KEY = 'WN_CARD_VIEW_STATE_V1';
const GLOBAL_PROJECT_KEY = '__global__';

function normalizeProjectKey(projectId: string | null) {
  const trimmed = typeof projectId === 'string' ? projectId.trim() : '';
  return trimmed ? trimmed : GLOBAL_PROJECT_KEY;
}

function clampScrollTop(value: unknown): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

function isCardStatus(value: unknown): value is CardStatus {
  return value === 'draft' || value === 'review' || value === 'done';
}

function normalizeProjectState(input: Partial<CardViewProjectState> | null | undefined): CardViewProjectState {
  const order = Array.isArray(input?.order) ? input!.order.map((v) => String(v)).filter(Boolean) : [];
  const statusById: Record<string, CardStatus> = {};
  if (input?.statusById && typeof input.statusById === 'object') {
    for (const [key, value] of Object.entries(input.statusById as Record<string, unknown>)) {
      if (!key) continue;
      if (!isCardStatus(value)) continue;
      statusById[key] = value;
    }
  }
  return {
    order,
    statusById,
    scrollTop: clampScrollTop(input?.scrollTop),
  };
}

function readPersisted(): PersistedCardViewStateV1 | null {
  try {
    const raw = localStorage.getItem(CARD_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCardViewStateV1> | null;
    if (!parsed || parsed.version !== 1) return null;
    const byProject: Record<string, CardViewProjectState> = {};
    if (parsed.byProject && typeof parsed.byProject === 'object') {
      for (const [key, value] of Object.entries(parsed.byProject as Record<string, unknown>)) {
        if (!key) continue;
        byProject[key] = normalizeProjectState(value as Partial<CardViewProjectState>);
      }
    }
    return { version: 1, byProject };
  } catch {
    return null;
  }
}

function persist(state: CardViewState) {
  const payload: PersistedCardViewStateV1 = {
    version: 1,
    byProject: state.byProject,
  };
  try {
    localStorage.setItem(CARD_VIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (non-critical preference persistence)
  }
}

function emptyProjectState(): CardViewProjectState {
  return { order: [], statusById: {}, scrollTop: 0 };
}

function reorder(list: string[], draggedId: string, overId: string) {
  const from = list.indexOf(draggedId);
  const to = list.indexOf(overId);
  if (from === -1 || to === -1) return list;
  if (from === to) return list;
  const next = list.slice();
  next.splice(from, 1);
  next.splice(to, 0, draggedId);
  return next;
}

/**
 * Why: Card view needs stable ordering and lightweight status metadata with real persistence, without adding new IPC
 * surface area before the UX is proven.
 */
export const useCardViewStore = create<CardViewState>((set, get) => ({
  isHydrated: false,
  byProject: {},

  hydrate: () => {
    const persisted = readPersisted();
    if (!persisted) {
      set({ isHydrated: true });
      return;
    }
    set({ byProject: persisted.byProject, isHydrated: true });
  },

  getProjectState: (projectId) => {
    const key = normalizeProjectKey(projectId);
    return get().byProject[key] ?? emptyProjectState();
  },

  syncOrder: (projectId, ids) => {
    const key = normalizeProjectKey(projectId);
    const uniqueIds = Array.from(new Set(ids.map((v) => String(v)).filter(Boolean)));
    set((state) => {
      const prev = state.byProject[key] ?? emptyProjectState();
      const prevOrder = prev.order.filter((id) => uniqueIds.includes(id));
      const missing = uniqueIds.filter((id) => !prevOrder.includes(id));
      const nextOrder = [...prevOrder, ...missing];
      const next: CardViewState = {
        ...state,
        byProject: {
          ...state.byProject,
          [key]: {
            ...prev,
            order: nextOrder,
          },
        },
      };
      persist(next);
      return next;
    });
  },

  moveCard: (projectId, draggedId, overId) => {
    const key = normalizeProjectKey(projectId);
    const fromId = typeof draggedId === 'string' ? draggedId : '';
    const toId = typeof overId === 'string' ? overId : '';
    if (!fromId || !toId || fromId === toId) return;

    set((state) => {
      const prev = state.byProject[key] ?? emptyProjectState();
      const nextOrder = reorder(prev.order, fromId, toId);
      const next: CardViewState = {
        ...state,
        byProject: { ...state.byProject, [key]: { ...prev, order: nextOrder } },
      };
      persist(next);
      return next;
    });
  },

  setStatus: (projectId, id, status) => {
    const key = normalizeProjectKey(projectId);
    const docId = typeof id === 'string' ? id : '';
    if (!docId) return;
    if (!isCardStatus(status)) return;

    set((state) => {
      const prev = state.byProject[key] ?? emptyProjectState();
      const next: CardViewState = {
        ...state,
        byProject: {
          ...state.byProject,
          [key]: {
            ...prev,
            statusById: {
              ...prev.statusById,
              [docId]: status,
            },
          },
        },
      };
      persist(next);
      return next;
    });
  },

  setScrollTop: (projectId, scrollTop) => {
    const key = normalizeProjectKey(projectId);
    const nextScrollTop = clampScrollTop(scrollTop);
    set((state) => {
      const prev = state.byProject[key] ?? emptyProjectState();
      const next: CardViewState = {
        ...state,
        byProject: {
          ...state.byProject,
          [key]: {
            ...prev,
            scrollTop: nextScrollTop,
          },
        },
      };
      persist(next);
      return next;
    });
  },
}));

