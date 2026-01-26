/**
 * StatsView - 创作统计视图
 * Why: 显示创作数据和趋势，数据来自 stats:getToday/getRange API
 */

import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@/lib/rpc/api';
import type {
  WritingStatsRow,
  StatsGetRangeResponse,
} from '@/types/ipc-generated';

/** 日期工具：获取指定日期的 YYYY-MM-DD 格式 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** 获取本周一到周日的日期范围 */
function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return { start: monday, end: sunday };
}

/** 中文星期映射 */
const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

export function StatsView() {
  const [todayStats, setTodayStats] = useState<WritingStatsRow | null>(null);
  const [rangeStats, setRangeStats] = useState<StatsGetRangeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 每日目标字数（可配置化）
  const dailyGoal = 3000;

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      
      try {
        // 并行请求今日和本周数据
        const { start, end } = getWeekRange();
        const [todayRes, rangeRes] = await Promise.all([
          invoke('stats:getToday', {}),
          invoke('stats:getRange', {
            startDate: formatDate(start),
            endDate: formatDate(end),
          }),
        ]);
        
        setTodayStats(todayRes.stats);
        setRangeStats(rangeRes);
      } catch (err) {
        console.error('[StatsView] Failed to fetch stats:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  // 构建本周柱状图数据
  const weeklyData = useMemo(() => {
    if (!rangeStats) {
      return DAY_NAMES.map((day) => ({ day, count: 0 }));
    }
    
    const { start } = getWeekRange();
    const statsMap = new Map(rangeStats.items.map((s) => [s.date, s]));
    
    return DAY_NAMES.map((day, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateStr = formatDate(date);
      const stats = statsMap.get(dateStr);
      return { day, count: stats?.wordCount ?? 0 };
    });
  }, [rangeStats]);

  const maxCount = Math.max(...weeklyData.map((d) => d.count), 1); // 至少为1避免除零

  // 今日进度百分比
  const todayProgress = todayStats
    ? Math.min((todayStats.wordCount / dailyGoal) * 100, 100)
    : 0;

  // 格式化时长（分钟转为可读格式）
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} 小时`;
  };

  if (loading) {
    return (
      <>
        <div className="h-11 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
          <span className="text-[13px] text-[var(--text-primary)]">创作统计</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[13px] text-[var(--text-tertiary)]">加载中...</span>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="h-11 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
          <span className="text-[13px] text-[var(--text-primary)]">创作统计</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <span className="text-[13px] text-red-500">{error}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-11 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
        <span className="text-[13px] text-[var(--text-primary)]">创作统计</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Hero Stats - 今日字数 + 目标进度 */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="stats-today-wordcount"
              className="text-[32px] font-light text-[var(--text-primary)] tabular-nums"
            >
              {(todayStats?.wordCount ?? 0).toLocaleString()}
            </span>
            <span className="text-[13px] text-[var(--text-tertiary)]">字</span>
          </div>
          <div className="h-px bg-[var(--border-default)]" />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--text-tertiary)]">目标进度</span>
            <span
              data-testid="stats-today-progress"
              className="text-[var(--text-secondary)] tabular-nums"
            >
              {Math.round(todayProgress)}%
            </span>
          </div>
          <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all"
              style={{ width: `${todayProgress}%` }}
            />
          </div>
        </div>

        {/* Today - 今日详情 */}
        <div className="space-y-2">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
            今日
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div
                data-testid="stats-today-wordcount-detail"
                className="text-[20px] font-light text-[var(--text-primary)] tabular-nums"
              >
                {(todayStats?.wordCount ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                字数
              </div>
            </div>
            <div>
              <div
                data-testid="stats-today-duration"
                className="text-[20px] font-light text-[var(--text-primary)] tabular-nums"
              >
                {formatDuration(todayStats?.writingMinutes ?? 0)}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                写作时长
              </div>
            </div>
          </div>
        </div>

        {/* This Week - 本周趋势 */}
        <div className="space-y-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
            本周
          </div>
          <div data-testid="stats-weekly-chart" className="flex items-end justify-between gap-1.5 h-28">
            {weeklyData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col gap-1.5">
                <div className="flex-1 bg-[var(--bg-secondary)] rounded-sm relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[var(--accent-primary)] opacity-80 transition-all"
                    style={{ height: `${(data.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] text-center">
                  {data.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Overall - 总计统计 */}
        <div className="space-y-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
            总计
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-[13px] text-[var(--text-secondary)]">
                总字数
              </span>
              <span
                data-testid="stats-total-wordcount"
                className="text-[15px] text-[var(--text-primary)] tabular-nums"
              >
                {(rangeStats?.summary.wordCount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-[13px] text-[var(--text-secondary)]">
                总时长
              </span>
              <span
                data-testid="stats-total-duration"
                className="text-[15px] text-[var(--text-primary)] tabular-nums"
              >
                {formatDuration(rangeStats?.summary.writingMinutes ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-[13px] text-[var(--text-secondary)]">
                文章数
              </span>
              <span
                data-testid="stats-total-articles"
                className="text-[15px] text-[var(--text-primary)] tabular-nums"
              >
                {rangeStats?.summary.articlesCreated ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[13px] text-[var(--text-secondary)]">
                技能使用
              </span>
              <span
                data-testid="stats-total-skills"
                className="text-[15px] text-[var(--text-primary)] tabular-nums"
              >
                {rangeStats?.summary.skillsUsed ?? 0} 次
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StatsView;
