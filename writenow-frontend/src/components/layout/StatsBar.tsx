/**
 * StatsBar - 顶部统计栏组件
 * Why: 显示字数进度、阅读时间、今日字数和番茄钟计时器
 * 数据来源：StatusBar store（编辑器实时统计）
 * 
 * Design: Uses semantic design tokens for consistent theming.
 */

import { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, Coffee, Play, Pause, X, Settings } from 'lucide-react';
import { useStatusBarStore } from '@/stores/statusBarStore';
import { cn } from '@/lib/utils';

interface StatsBarProps {
  onOpenStats: () => void;
  /** 目标字数（可配置） */
  targetWordCount?: number;
}

export function StatsBar({
  onOpenStats,
  targetWordCount = 3000,
}: StatsBarProps) {
  // 从 StatusBar store 获取真实数据
  const wordCount = useStatusBarStore((s) => s.wordCount);
  // TODO: 今日字数需要从后端统计 API 获取，暂时使用当前字数作为占位
  const todayWordCount = wordCount;
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            setPomodoroActive(false);
            setShowBreakReminder(true);
            return customMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroTime, customMinutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePomodoro = () => {
    setPomodoroActive(!pomodoroActive);
  };

  const resetPomodoro = () => {
    setPomodoroActive(false);
    setPomodoroTime(customMinutes * 60);
  };

  const applyTimerSettings = () => {
    setPomodoroTime(customMinutes * 60);
    setShowTimerSettings(false);
    setPomodoroActive(false);
  };

  const progressPercent = Math.min((wordCount / targetWordCount) * 100, 100);
  const readingTime = Math.ceil(wordCount / 250);

  return (
    <>
      <div className="h-9 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center px-4 gap-4">
        {/* Word Count - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2.5 hover:bg-[var(--bg-hover)] px-2.5 py-1.5 -mx-2 rounded-md transition-all"
        >
          <Target className="w-3.5 h-3.5 text-[var(--accent-default)]" />
          <span className="text-[11px] text-[var(--fg-muted)] font-medium tabular-nums">
            {wordCount.toLocaleString()} 字
          </span>
          <div className="w-20 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-default)] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--fg-subtle)] tabular-nums">
            / {targetWordCount.toLocaleString()}
          </span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* Reading Time - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2.5 py-1.5 -mx-2 rounded-md transition-all"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
          <span className="text-[11px] text-[var(--fg-muted)]">
            约 {readingTime} 分钟
          </span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* Today's Progress - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2.5 py-1.5 -mx-2 rounded-md transition-all"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
          <span className="text-[11px] text-[var(--fg-muted)]">
            今日 {todayWordCount.toLocaleString()} 字
          </span>
        </button>

        <div className="flex-1" />

        {/* Pomodoro Timer */}
        <div className="flex items-center gap-2">
          <Coffee className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
          <button
            onClick={togglePomodoro}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            {pomodoroActive ? (
              <Pause className="w-3 h-3 text-[var(--fg-muted)]" />
            ) : (
              <Play className="w-3 h-3 text-[var(--fg-muted)]" />
            )}
            <span
              className={cn(
                'text-[11px] font-mono',
                pomodoroActive ? 'text-[var(--accent-default)]' : 'text-[var(--fg-muted)]'
              )}
            >
              {formatTime(pomodoroTime)}
            </span>
          </button>
          <button
            onClick={() => setShowTimerSettings(!showTimerSettings)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="设置计时器"
          >
            <Settings className="w-3 h-3 text-[var(--fg-subtle)]" />
          </button>
          {pomodoroActive && (
            <button
              onClick={resetPomodoro}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <X className="w-3 h-3 text-[var(--fg-subtle)]" />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button className="h-6 px-2 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[10px] text-[var(--fg-muted)] transition-colors border border-[var(--border-subtle)]">
            导出
          </button>
          <button className="h-6 px-2 rounded bg-[var(--accent-default)] hover:bg-[var(--accent-hover)] text-[10px] text-[var(--fg-on-accent)] transition-colors">
            发布
          </button>
        </div>
      </div>

      {/* Timer Settings Modal */}
      {showTimerSettings && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-6 max-w-sm shadow-xl">
            <h3 className="text-[15px] text-[var(--fg-default)] font-medium mb-4">
              设置计时器
            </h3>
            <div className="mb-4">
              <label className="text-[13px] text-[var(--fg-muted)] mb-2 block">
                工作时长（分钟）
              </label>
              <input
                type="number"
                value={customMinutes}
                onChange={(e) =>
                  setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full h-8 px-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded text-[13px] text-[var(--fg-default)] outline-none focus:border-[var(--border-focus)]"
                min="1"
                max="120"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyTimerSettings}
                className="flex-1 h-8 px-3 bg-[var(--accent-default)] hover:bg-[var(--accent-hover)] rounded text-[13px] text-[var(--fg-on-accent)] transition-colors"
              >
                应用
              </button>
              <button
                onClick={() => setShowTimerSettings(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded text-[13px] text-[var(--fg-muted)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Break Reminder Modal */}
      {showBreakReminder && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-6 max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Coffee className="w-8 h-8 text-[var(--accent-default)]" />
              <div>
                <h3 className="text-[15px] text-[var(--fg-default)] font-medium mb-1">
                  该休息了！
                </h3>
                <p className="text-[13px] text-[var(--fg-muted)]">
                  您已经专注工作了 {customMinutes} 分钟
                </p>
              </div>
            </div>
            <p className="text-[13px] text-[var(--fg-subtle)] mb-4 leading-relaxed">
              建议休息 5-10 分钟，活动一下身体，眺望远方放松眼睛。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBreakReminder(false);
                  resetPomodoro();
                }}
                className="flex-1 h-8 px-3 bg-[var(--accent-default)] hover:bg-[var(--accent-hover)] rounded text-[13px] text-[var(--fg-on-accent)] transition-colors"
              >
                开始休息
              </button>
              <button
                onClick={() => {
                  setShowBreakReminder(false);
                  setPomodoroActive(true);
                }}
                className="flex-1 h-8 px-3 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded text-[13px] text-[var(--fg-muted)] transition-colors"
              >
                继续工作
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StatsBar;
