import { create } from 'zustand';

import { IpcError, statsOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

export type PomodoroPhase = 'focus' | 'break';
export type PomodoroStatus = 'idle' | 'running' | 'paused';

type PomodoroDurations = {
  focusMinutes: number;
  breakMinutes: number;
};

type PomodoroCompletion = {
  phase: PomodoroPhase;
  at: number;
};

type PomodoroPendingCredit = {
  date: string;
  minutes: number;
};

type PersistedPomodoroStateV1 = {
  version: 1;
  status: PomodoroStatus;
  phase: PomodoroPhase;
  durations: PomodoroDurations;
  phaseEndAt: number | null;
  remainingMs: number;
  pendingCredits?: PomodoroPendingCredit[];
  pendingCreditMinutes?: number;
};

type PomodoroState = {
  status: PomodoroStatus;
  phase: PomodoroPhase;
  durations: PomodoroDurations;
  phaseEndAt: number | null;
  remainingMs: number;
  pendingCredits: PomodoroPendingCredit[];
  isFlushingCredit: boolean;
  lastCompletion: PomodoroCompletion | null;
  lastCreditAt: number | null;
  error: string | null;
  isHydrated: boolean;

  hydrate: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setDurations: (durations: Partial<PomodoroDurations>) => void;
  tick: (nowMs?: number) => void;
  flushPendingCredit: () => Promise<void>;
  clearCompletion: () => void;
  clearError: () => void;
};

const POMODORO_STORAGE_KEY = 'WN_POMODORO_STATE_V1';

function getStatsApi() {
  return statsOps;
}

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function clampMinutes(value: unknown, fallback: number): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(120, Math.floor(raw)));
}

function msFromMinutes(minutes: number): number {
  const rawScale = (window as unknown as { writenow?: { pomodoroTimeScale?: unknown } }).writenow?.pomodoroTimeScale;
  const scale = typeof rawScale === 'number' && Number.isFinite(rawScale) && rawScale > 0 ? Math.min(1, Math.max(0.05, rawScale)) : 1;
  return minutes * 60 * 1000 * scale;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toLocalDateKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function serialize(state: PomodoroState): PersistedPomodoroStateV1 {
  return {
    version: 1,
    status: state.status,
    phase: state.phase,
    durations: state.durations,
    phaseEndAt: state.phaseEndAt,
    remainingMs: state.remainingMs,
    pendingCredits: state.pendingCredits,
  };
}

function persist(state: PomodoroState) {
  try {
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(serialize(state)));
  } catch {
    // ignore (non-critical persistence)
  }
}

function readPersisted(nowMs: number): PersistedPomodoroStateV1 | null {
  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedPomodoroStateV1> | null;
    if (!parsed || parsed.version !== 1) return null;
    if (parsed.status !== 'idle' && parsed.status !== 'running' && parsed.status !== 'paused') return null;
    if (parsed.phase !== 'focus' && parsed.phase !== 'break') return null;

    const focusMinutes = clampMinutes(parsed.durations?.focusMinutes, 25);
    const breakMinutes = clampMinutes(parsed.durations?.breakMinutes, 5);
    const durations = { focusMinutes, breakMinutes };

    const phaseEndAt = typeof parsed.phaseEndAt === 'number' && Number.isFinite(parsed.phaseEndAt) ? parsed.phaseEndAt : null;
    const remainingMsRaw = typeof parsed.remainingMs === 'number' && Number.isFinite(parsed.remainingMs) ? parsed.remainingMs : msFromMinutes(durations.focusMinutes);
    const remainingMs = Math.max(0, Math.floor(remainingMsRaw));
    const pendingCredits = Array.isArray(parsed.pendingCredits) ? parsed.pendingCredits : [];
    const pendingCreditsCoerced = pendingCredits
      .map((item) => ({
        date: typeof item?.date === 'string' ? item.date.trim() : '',
        minutes: Math.max(0, Math.floor(Number(item?.minutes) || 0)),
      }))
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.minutes > 0);
    const legacyPendingMinutes = Math.max(0, Math.floor(Number(parsed.pendingCreditMinutes) || 0));
    if (legacyPendingMinutes > 0) {
      pendingCreditsCoerced.push({ date: toLocalDateKey(nowMs), minutes: legacyPendingMinutes });
    }

    if (parsed.status === 'running' && phaseEndAt === null) return null;
    if (parsed.status !== 'running' && phaseEndAt !== null) return null;

    const computedRemaining = parsed.status === 'running' && phaseEndAt ? Math.max(0, phaseEndAt - nowMs) : remainingMs;

    return {
      version: 1,
      status: parsed.status,
      phase: parsed.phase,
      durations,
      phaseEndAt,
      remainingMs: computedRemaining,
      pendingCredits: pendingCreditsCoerced,
    };
  } catch {
    return null;
  }
}

function mergePendingCredits(existing: PomodoroPendingCredit[], next: PomodoroPendingCredit): PomodoroPendingCredit[] {
  const date = next.date.trim();
  const minutes = Math.max(0, Math.floor(next.minutes));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || minutes <= 0) return existing;

  const normalized = existing.filter((item) => item.minutes > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  const idx = normalized.findIndex((item) => item.date === date);
  if (idx === -1) return [...normalized, { date, minutes }];
  const merged = [...normalized];
  merged[idx] = { date, minutes: merged[idx].minutes + minutes };
  return merged;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  status: 'idle',
  phase: 'focus',
  durations: { focusMinutes: 25, breakMinutes: 5 },
  phaseEndAt: null,
  remainingMs: msFromMinutes(25),
  pendingCredits: [],
  isFlushingCredit: false,
  lastCompletion: null,
  lastCreditAt: null,
  error: null,
  isHydrated: false,

  /**
   * Why: Pomodoro must be recoverable across restarts, so UI needs a one-time hydration step.
   */
  hydrate: () => {
    const nowMs = Date.now();
    const persisted = readPersisted(nowMs);
    if (!persisted) {
      set({ isHydrated: true });
      return;
    }

    set({
      status: persisted.status,
      phase: persisted.phase,
      durations: persisted.durations,
      phaseEndAt: persisted.phaseEndAt,
      remainingMs: persisted.remainingMs,
      pendingCredits: persisted.pendingCredits ?? [],
      isHydrated: true,
    });

    get().tick(nowMs);
    get().flushPendingCredit().catch(() => undefined);
  },

  start: () => {
    const state = get();
    const nowMs = Date.now();
    if (state.status === 'running') return;
    if (state.status === 'paused') {
      get().resume();
      return;
    }

    const remainingMs = state.phase === 'break' ? msFromMinutes(state.durations.breakMinutes) : msFromMinutes(state.durations.focusMinutes);
    const phase: PomodoroPhase = state.phase === 'break' ? 'break' : 'focus';
    const phaseEndAt = nowMs + remainingMs;

    set({
      status: 'running',
      phase,
      phaseEndAt,
      remainingMs,
      error: null,
    });
    persist(get());
  },

  pause: () => {
    const state = get();
    if (state.status !== 'running') return;
    const nowMs = Date.now();
    const remainingMs = state.phaseEndAt ? Math.max(0, state.phaseEndAt - nowMs) : state.remainingMs;
    set({ status: 'paused', phaseEndAt: null, remainingMs });
    persist(get());
  },

  resume: () => {
    const state = get();
    if (state.status !== 'paused') return;
    const nowMs = Date.now();
    const phaseEndAt = nowMs + Math.max(0, state.remainingMs);
    set({ status: 'running', phaseEndAt, error: null });
    persist(get());
  },

  stop: () => {
    const { focusMinutes } = get().durations;
    set({
      status: 'idle',
      phase: 'focus',
      phaseEndAt: null,
      remainingMs: msFromMinutes(focusMinutes),
      lastCompletion: null,
      error: null,
    });
    persist(get());
  },

  setDurations: (durations) => {
    const current = get();
    const focusMinutes = clampMinutes(durations.focusMinutes, current.durations.focusMinutes);
    const breakMinutes = clampMinutes(durations.breakMinutes, current.durations.breakMinutes);
    const nextDurations = { focusMinutes, breakMinutes };

    if (current.status === 'idle') {
      set({
        durations: nextDurations,
        phase: 'focus',
        remainingMs: msFromMinutes(focusMinutes),
      });
    } else {
      set({ durations: nextDurations });
    }
    persist(get());
  },

  tick: (nowMsArg) => {
    const nowMs = typeof nowMsArg === 'number' ? nowMsArg : Date.now();
    const state = get();
    if (state.status !== 'running' || typeof state.phaseEndAt !== 'number') return;

    const remainingMs = Math.max(0, state.phaseEndAt - nowMs);
    if (remainingMs !== state.remainingMs) set({ remainingMs });
    if (remainingMs > 0) return;

    if (state.phase === 'focus') {
      const focusMinutes = state.durations.focusMinutes;
      const breakMs = msFromMinutes(state.durations.breakMinutes);
      const creditedAt = toLocalDateKey(nowMs);
      const nextPending = mergePendingCredits(state.pendingCredits, { date: creditedAt, minutes: focusMinutes });

      set({
        phase: 'break',
        status: 'running',
        phaseEndAt: nowMs + breakMs,
        remainingMs: breakMs,
        pendingCredits: nextPending,
        lastCompletion: { phase: 'focus', at: nowMs },
      });
      persist(get());
      get().flushPendingCredit().catch(() => undefined);
      return;
    }

    const focusMs = msFromMinutes(state.durations.focusMinutes);
    set({
      phase: 'focus',
      status: 'idle',
      phaseEndAt: null,
      remainingMs: focusMs,
      lastCompletion: { phase: 'break', at: nowMs },
    });
    persist(get());
  },

  /**
   * Why: focus minutes must be credited into persisted `writing_stats`, and failures must be recoverable.
   */
  flushPendingCredit: async () => {
    const state = get();
    if (state.isFlushingCredit) return;
    if (state.pendingCredits.length === 0) return;
    set({ isFlushingCredit: true });

    try {
      // Process sequentially and persist progress to avoid double-credit on retries.
      while (get().pendingCredits.length > 0) {
        const current = get().pendingCredits;
        const item = current[0];

        try {
          await getStatsApi().increment({ date: item.date, increments: { writingMinutes: item.minutes } });
        } catch (error) {
          set({ error: toErrorMessage(error) });
          return;
        }

        set({ pendingCredits: current.slice(1), lastCreditAt: Date.now(), error: null });
        persist(get());
      }
    } finally {
      set({ isFlushingCredit: false });
    }
  },

  clearCompletion: () => set({ lastCompletion: null }),
  clearError: () => set({ error: null }),
}));
