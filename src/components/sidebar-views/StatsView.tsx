import React, { useEffect, useMemo, useState } from 'react';

import type { StatsViewRange } from '../../stores/statsStore';
import { useStatsStore } from '../../stores/statsStore';

function formatNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)).toLocaleString('zh-CN') : '0';
}

function formatMinutes(value: number) {
  const minutes = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function parseDateKey(dateKey: string): Date | null {
  const raw = typeof dateKey === 'string' ? dateKey.trim() : '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function toWeekdayLabel(date: Date) {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  return labels[date.getDay()] ?? '';
}

function enumerateDateKeys(startDate: string, endDate: string) {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end) return [];
  const keys: string[] = [];

  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endLocal = new Date(end);
  endLocal.setHours(0, 0, 0, 0);

  while (cur.getTime() <= endLocal.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function rangeTitle(view: StatsViewRange) {
  if (view === 'day') return '最近 7 天';
  if (view === 'week') return '本周';
  return '本月';
}

export function StatsView() {
  const today = useStatsStore((s) => s.today);
  const range = useStatsStore((s) => s.range);
  const summary = useStatsStore((s) => s.summary);
  const view = useStatsStore((s) => s.view);
  const rangeStartDate = useStatsStore((s) => s.rangeStartDate);
  const rangeEndDate = useStatsStore((s) => s.rangeEndDate);
  const dailyWordGoal = useStatsStore((s) => s.dailyWordGoal);
  const setDailyWordGoal = useStatsStore((s) => s.setDailyWordGoal);
  const setView = useStatsStore((s) => s.setView);
  const refresh = useStatsStore((s) => s.refresh);
  const isLoading = useStatsStore((s) => s.isLoading);
  const error = useStatsStore((s) => s.error);

  const [goalDraft, setGoalDraft] = useState(dailyWordGoal);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    setGoalDraft(dailyWordGoal);
  }, [dailyWordGoal]);

  const filledRange = useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return [];
    const keys = enumerateDateKeys(rangeStartDate, rangeEndDate);
    const byDate = new Map(range.map((row) => [row.date, row]));
    return keys.map((key) => {
      const row = byDate.get(key);
      return (
        row ?? {
          date: key,
          wordCount: 0,
          writingMinutes: 0,
          articlesCreated: 0,
          skillsUsed: 0,
        }
      );
    });
  }, [range, rangeEndDate, rangeStartDate]);

  const maxWordCount = useMemo(() => {
    const max = Math.max(1, ...filledRange.map((r) => r.wordCount));
    return Number.isFinite(max) ? max : 1;
  }, [filledRange]);

  const todayWordCount = today?.wordCount ?? 0;
  const goalProgress = useMemo(() => {
    const goal = Math.max(1, dailyWordGoal);
    const ratio = Math.min(1, Math.max(0, todayWordCount / goal));
    return Math.round(ratio * 100);
  }, [dailyWordGoal, todayWordCount]);

  return (
    <>
      <div className="h-11 flex items-center justify-between px-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--text-primary)]">创作统计</span>
          {rangeStartDate && rangeEndDate && (
            <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
              {rangeStartDate} ~ {rangeEndDate}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(['day', 'week', 'month'] as const).map((key) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`h-7 px-2 rounded-md text-[12px] transition-colors ${
                  active
                    ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                {key === 'day' ? '日' : key === 'week' ? '周' : '月'}
              </button>
            );
          })}
          <button
            onClick={() => refresh().catch(() => undefined)}
            className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {error && (
          <div className="wn-elevated p-4 text-[12px] text-[var(--text-tertiary)]">
            <div className="mb-3">加载统计失败：{error}</div>
            <button
              onClick={() => refresh().catch(() => undefined)}
              className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {!error && isLoading && !today && (
          <div className="text-[12px] text-[var(--text-tertiary)]">加载中…</div>
        )}

        {!error && (
          <>
            {/* Hero */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-light text-[var(--text-primary)] tabular-nums">
                  {formatNumber(todayWordCount)}
                </span>
                <span className="text-[13px] text-[var(--text-tertiary)]">字（今日）</span>
              </div>
              <div className="h-px bg-[var(--border-default)]" />
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--text-tertiary)]">目标进度</span>
                <span className="text-[var(--text-secondary)] tabular-nums">{goalProgress}%</span>
              </div>
              <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-primary)] transition-all" style={{ width: `${goalProgress}%` }} />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-[var(--text-tertiary)]">每日目标（字）</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                    className="w-28 h-7 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    min="1"
                    max="100000"
                  />
                  <button
                    onClick={() => setDailyWordGoal(goalDraft)}
                    className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>

            {/* Today metrics */}
            <div className="space-y-2">
              <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">今日</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[20px] font-light text-[var(--text-primary)] tabular-nums">{formatMinutes(today?.writingMinutes ?? 0)}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">专注时长</div>
                </div>
                <div>
                  <div className="text-[20px] font-light text-[var(--text-primary)] tabular-nums">{formatNumber(today?.articlesCreated ?? 0)}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">新建文章</div>
                </div>
                <div>
                  <div className="text-[20px] font-light text-[var(--text-primary)] tabular-nums">{formatNumber(today?.skillsUsed ?? 0)}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">SKILL 次数</div>
                </div>
                <div>
                  <div className="text-[20px] font-light text-[var(--text-primary)] tabular-nums">{formatNumber(todayWordCount)}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">字数</div>
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">{rangeTitle(view)}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  {summary
                    ? `合计 ${formatNumber(summary.wordCount)} 字 · ${formatMinutes(summary.writingMinutes)}`
                    : '—'}
                </div>
              </div>

              <div className="flex items-end justify-between gap-1.5 h-28">
                {filledRange.map((row) => {
                  const date = parseDateKey(row.date);
                  const label =
                    view === 'month'
                      ? date
                        ? String(date.getDate())
                        : ''
                      : date
                        ? toWeekdayLabel(date)
                        : '';
                  const heightPct = Math.round((row.wordCount / maxWordCount) * 100);
                  return (
                    <div key={row.date} className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div
                        className="flex-1 bg-[var(--bg-secondary)] rounded-sm relative overflow-hidden"
                        title={`${row.date} · ${formatNumber(row.wordCount)} 字`}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-[var(--accent-primary)] opacity-80 transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)] text-center truncate">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3 pb-4">
              <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">区间汇总</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[13px] text-[var(--text-secondary)]">总字数</span>
                  <span className="text-[15px] text-[var(--text-primary)] tabular-nums">{formatNumber(summary?.wordCount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[13px] text-[var(--text-secondary)]">专注时长</span>
                  <span className="text-[15px] text-[var(--text-primary)] tabular-nums">{formatMinutes(summary?.writingMinutes ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[13px] text-[var(--text-secondary)]">新建文章</span>
                  <span className="text-[15px] text-[var(--text-primary)] tabular-nums">{formatNumber(summary?.articlesCreated ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[13px] text-[var(--text-secondary)]">SKILL 次数</span>
                  <span className="text-[15px] text-[var(--text-primary)] tabular-nums">{formatNumber(summary?.skillsUsed ?? 0)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
