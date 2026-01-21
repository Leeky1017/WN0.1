import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Target, TrendingUp, Coffee, Play, Pause, X, Settings } from 'lucide-react';

import { useEditorStore } from '../stores/editorStore';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { useStatsStore } from '../stores/statsStore';

interface StatsBarProps {
  onOpenStats: () => void;
}

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

function formatTimer(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function StatsBar({ onOpenStats }: StatsBarProps) {
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [focusMinutesDraft, setFocusMinutesDraft] = useState(25);
  const [breakMinutesDraft, setBreakMinutesDraft] = useState(5);

  const today = useStatsStore((s) => s.today);
  const dailyGoal = useStatsStore((s) => s.dailyWordGoal);
  const refreshToday = useStatsStore((s) => s.refreshToday);

  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);

  const status = usePomodoroStore((s) => s.status);
  const phase = usePomodoroStore((s) => s.phase);
  const remainingMs = usePomodoroStore((s) => s.remainingMs);
  const durations = usePomodoroStore((s) => s.durations);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const stop = usePomodoroStore((s) => s.stop);
  const setDurations = usePomodoroStore((s) => s.setDurations);
  const pendingCredits = usePomodoroStore((s) => s.pendingCredits);
  const pomodoroError = usePomodoroStore((s) => s.error);
  const lastCreditAt = usePomodoroStore((s) => s.lastCreditAt);
  const flushPendingCredit = usePomodoroStore((s) => s.flushPendingCredit);

  useEffect(() => {
    refreshToday().catch(() => undefined);
  }, [refreshToday]);

  useEffect(() => {
    if (!lastSavedAt) return;
    refreshToday().catch(() => undefined);
  }, [lastSavedAt, refreshToday]);

  useEffect(() => {
    if (!lastCreditAt) return;
    refreshToday().catch(() => undefined);
  }, [lastCreditAt, refreshToday]);

  const wordCount = today?.wordCount ?? 0;
  const writingMinutes = today?.writingMinutes ?? 0;
  const articlesCreated = today?.articlesCreated ?? 0;

  const goalProgress = useMemo(() => {
    const goal = Math.max(1, dailyGoal);
    const ratio = Math.min(1, Math.max(0, wordCount / goal));
    return Math.round(ratio * 100);
  }, [dailyGoal, wordCount]);

  const phaseLabel = phase === 'break' ? '休息' : '专注';
  const phaseAccent = phase === 'break' ? 'text-emerald-400' : 'text-[var(--accent-primary)]';
  const timerLabel = formatTimer(remainingMs);

  return (
    <>
      <div className="h-8 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center px-4 gap-6">
        {/* Word Count - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2 py-1 -mx-2 rounded-md transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">{formatNumber(wordCount)} 字</span>
          <div className="w-20 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${goalProgress}%` }} />
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)]">/ {formatNumber(dailyGoal)}</span>
        </button>

        {/* Focus Minutes - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2 py-1 -mx-2 rounded-md transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">专注 {formatMinutes(writingMinutes)}</span>
        </button>

        {/* Articles Created - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2 py-1 -mx-2 rounded-md transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">今日 {formatNumber(articlesCreated)} 篇</span>
        </button>

        <div className="flex-1" />

        {/* Pomodoro Timer */}
        <div className="flex items-center gap-2">
          <Coffee className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <button
            onClick={() => {
              if (status === 'running') pause();
              else start();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            {status === 'running' ? (
              <Pause className="w-3 h-3 text-[var(--text-secondary)]" />
            ) : (
              <Play className="w-3 h-3 text-[var(--text-secondary)]" />
            )}
            <span className={`text-[10px] ${phaseAccent}`}>{phaseLabel}</span>
            <span className={`text-[11px] font-mono ${status === 'running' ? phaseAccent : 'text-[var(--text-secondary)]'}`}>
              {timerLabel}
            </span>
          </button>
          <button
            onClick={() => {
              if (showTimerSettings) {
                setShowTimerSettings(false);
                return;
              }
              setFocusMinutesDraft(durations.focusMinutes);
              setBreakMinutesDraft(durations.breakMinutes);
              setShowTimerSettings(true);
            }}
            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            title="设置计时器"
          >
            <Settings className="w-3 h-3 text-[var(--text-tertiary)]" />
          </button>
          {status !== 'idle' && (
            <button
              onClick={stop}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              title="结束"
            >
              <X className="w-3 h-3 text-[var(--text-tertiary)]" />
            </button>
          )}
          {pendingCredits.length > 0 && (
            <button
              onClick={() => flushPendingCredit().catch(() => undefined)}
              className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              title={pomodoroError ?? '专注分钟待同步'}
            >
              待同步
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button className="h-6 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] transition-colors">
            导出
          </button>
          <button className="h-6 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-xs text-white transition-colors">
            发布
          </button>
        </div>
      </div>

      {/* Timer Settings Modal */}
      {showTimerSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="wn-elevated p-6 max-w-sm">
            <h3 className="text-[15px] text-[var(--text-primary)] mb-4">设置计时器</h3>
            <div className="space-y-4 mb-4">
              <div>
                <label htmlFor="wn-pomodoro-focus-minutes" className="text-[13px] text-[var(--text-secondary)] mb-2 block">
                  专注时长（分钟）
                </label>
                <input
                  id="wn-pomodoro-focus-minutes"
                  type="number"
                  value={focusMinutesDraft}
                  onChange={(e) => setFocusMinutesDraft(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  min="1"
                  max="120"
                />
              </div>
              <div>
                <label htmlFor="wn-pomodoro-break-minutes" className="text-[13px] text-[var(--text-secondary)] mb-2 block">
                  休息时长（分钟）
                </label>
                <input
                  id="wn-pomodoro-break-minutes"
                  type="number"
                  value={breakMinutesDraft}
                  onChange={(e) => setBreakMinutesDraft(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  min="1"
                  max="60"
                />
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                修改时长会对下一轮生效；进行中的计时不会被重置。
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDurations({ focusMinutes: focusMinutesDraft, breakMinutes: breakMinutesDraft });
                  setShowTimerSettings(false);
                }}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors"
              >
                应用
              </button>
              <button
                onClick={() => setShowTimerSettings(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
