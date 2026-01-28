/**
 * useStats hook
 * Why: Fetch and manage writing statistics from the backend.
 */

import { useCallback, useEffect, useState } from 'react';

import { invoke } from '@/lib/rpc';
import type { WritingStatsRow, WritingStatsSummary } from '@/types/ipc-generated';

export interface UseStatsResult {
  todayStats: WritingStatsRow | null;
  rangeStats: WritingStatsRow[] | null;
  rangeSummary: WritingStatsSummary | null;
  loading: boolean;
  error: string | null;

  refreshToday: () => Promise<void>;
  getRange: (startDate: string, endDate: string) => Promise<void>;
  increment: (increments: {
    wordCount?: number;
    writingMinutes?: number;
    articlesCreated?: number;
    skillsUsed?: number;
  }) => Promise<void>;
}

export function useStats(): UseStatsResult {
  const [todayStats, setTodayStats] = useState<WritingStatsRow | null>(null);
  const [rangeStats, setRangeStats] = useState<WritingStatsRow[] | null>(null);
  const [rangeSummary, setRangeSummary] = useState<WritingStatsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke('stats:getToday', {});
      setTodayStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load today stats');
      setTodayStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRange = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke('stats:getRange', { startDate, endDate });
      setRangeStats(res.items);
      setRangeSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load range stats');
      setRangeStats(null);
      setRangeSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const increment = useCallback(async (increments: {
    wordCount?: number;
    writingMinutes?: number;
    articlesCreated?: number;
    skillsUsed?: number;
  }) => {
    try {
      const res = await invoke('stats:increment', { increments });
      setTodayStats(res.stats);
    } catch (err) {
      console.warn('[Stats] Failed to increment:', err);
      // Why: Increment failures are non-blocking; we continue with stale data.
    }
  }, []);

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  return {
    todayStats,
    rangeStats,
    rangeSummary,
    loading,
    error,
    refreshToday,
    getRange,
    increment,
  };
}

export default useStats;
