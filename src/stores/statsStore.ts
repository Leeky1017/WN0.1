import { create } from 'zustand';

import type { WritingStatsRow, WritingStatsSummary } from '../types/ipc';
import { IpcError, statsOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';

export type StatsViewRange = 'day' | 'week' | 'month';

type StatsState = {
  today: WritingStatsRow | null;
  range: WritingStatsRow[];
  summary: WritingStatsSummary | null;
  rangeStartDate: string | null;
  rangeEndDate: string | null;
  view: StatsViewRange;
  dailyWordGoal: number;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  setView: (view: StatsViewRange) => void;
  setDailyWordGoal: (goal: number) => void;
  refresh: () => Promise<void>;
  refreshToday: () => Promise<void>;
};

const DAILY_WORD_GOAL_KEY = 'WN_DAILY_WORD_GOAL_V1';
const DEFAULT_DAILY_WORD_GOAL = 3000;

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

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * Why: the stats table is keyed by local calendar day, so UI date ranges must be computed in local time.
 */
function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 (Sun) ... 6 (Sat)
  const mondayBased = (day + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - mondayBased);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeRange(view: StatsViewRange, now: Date): { startDate: string; endDate: string } {
  const todayKey = toLocalDateKey(now);

  if (view === 'day') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return { startDate: toLocalDateKey(start), endDate: todayKey };
  }

  if (view === 'week') {
    const start = startOfWeek(now);
    const end = endOfWeek(now);
    return { startDate: toLocalDateKey(start), endDate: toLocalDateKey(end) };
  }

  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return { startDate: toLocalDateKey(start), endDate: toLocalDateKey(end) };
}

function loadDailyWordGoal(): number {
  try {
    const raw = localStorage.getItem(DAILY_WORD_GOAL_KEY);
    if (!raw) return DEFAULT_DAILY_WORD_GOAL;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DAILY_WORD_GOAL;
    return parsed;
  } catch {
    return DEFAULT_DAILY_WORD_GOAL;
  }
}

function storeDailyWordGoal(goal: number) {
  try {
    localStorage.setItem(DAILY_WORD_GOAL_KEY, String(goal));
  } catch {
    // ignore (non-critical preference)
  }
}

export const useStatsStore = create<StatsState>((set, get) => ({
  today: null,
  range: [],
  summary: null,
  rangeStartDate: null,
  rangeEndDate: null,
  view: 'day',
  dailyWordGoal: loadDailyWordGoal(),
  isLoading: false,
  hasLoaded: false,
  error: null,

  setView: (view) => {
    set({ view });
    get().refresh().catch(() => undefined);
  },

  setDailyWordGoal: (goal: number) => {
    const next = Number.isFinite(goal) ? Math.max(1, Math.floor(goal)) : DEFAULT_DAILY_WORD_GOAL;
    storeDailyWordGoal(next);
    set({ dailyWordGoal: next });
  },

  refreshToday: async () => {
    set({ isLoading: true, error: null });
    try {
      const { stats } = await getStatsApi().getToday();
      set({ today: stats, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error), hasLoaded: true });
    }
  },

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const rangeDates = computeRange(get().view, now);
      const [{ stats }, range] = await Promise.all([
        getStatsApi().getToday(),
        getStatsApi().getRange(rangeDates),
      ]);
      set({
        today: stats,
        range: range.items,
        summary: range.summary,
        rangeStartDate: rangeDates.startDate,
        rangeEndDate: rangeDates.endDate,
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error), hasLoaded: true });
    }
  },
}));
