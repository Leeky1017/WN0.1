/**
 * StatsBar - 顶部统计栏组件
 * Why: 显示字数进度、阅读时间、今日字数和番茄钟计时器
 * 数据来源：StatusBar store（编辑器实时统计）
 */

import { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, Coffee, Play, Pause, X, Settings } from 'lucide-react';
import { useStatusBarStore } from '@/stores/statusBarStore';

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
      <div className="h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center px-4 gap-4">
        {/* Word Count - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2.5 hover:bg-[var(--bg-hover)] px-2.5 py-1.5 -mx-2 rounded-md transition-all duration-150"
        >
          <Target className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[11px] text-[var(--text-secondary)] font-medium tabular-nums">
            {wordCount.toLocaleString()} 字
          </span>
          <div className="w-20 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
            / {targetWordCount.toLocaleString()}
          </span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* Reading Time - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2.5 py-1.5 -mx-2 rounded-md transition-all duration-150"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">
            约 {readingTime} 分钟
          </span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* Today's Progress - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2.5 py-1.5 -mx-2 rounded-md transition-all duration-150"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">
            今日 {todayWordCount.toLocaleString()} 字
          </span>
        </button>

        <div className="flex-1" />

        {/* Pomodoro Timer */}
        <div className="flex items-center gap-2">
          <Coffee className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <button
            onClick={togglePomodoro}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            {pomodoroActive ? (
              <Pause className="w-3 h-3 text-[var(--text-secondary)]" />
            ) : (
              <Play className="w-3 h-3 text-[var(--text-secondary)]" />
            )}
            <span
              className={`text-[11px] font-mono ${pomodoroActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
              {formatTime(pomodoroTime)}
            </span>
          </button>
          <button
            onClick={() => setShowTimerSettings(!showTimerSettings)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="设置计时器"
          >
            <Settings className="w-3 h-3 text-[var(--text-tertiary)]" />
          </button>
          {pomodoroActive && (
            <button
              onClick={resetPomodoro}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            >
              <X className="w-3 h-3 text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button className="h-6 px-2 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[10px] text-[var(--text-secondary)] transition-colors">
            导出
          </button>
          <button className="h-6 px-2 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[10px] text-white transition-colors">
            发布
          </button>
        </div>
      </div>

      {/* Timer Settings Modal */}
      {showTimerSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-6 max-w-sm">
            <h3 className="text-[15px] text-[var(--text-primary)] mb-4">
              设置计时器
            </h3>
            <div className="mb-4">
              <label className="text-[13px] text-[var(--text-secondary)] mb-2 block">
                工作时长（分钟）
              </label>
              <input
                type="number"
                value={customMinutes}
                onChange={(e) =>
                  setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                min="1"
                max="120"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyTimerSettings}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded text-[13px] text-white transition-colors"
              >
                应用
              </button>
              <button
                onClick={() => setShowTimerSettings(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Break Reminder Modal */}
      {showBreakReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-6 max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <Coffee className="w-8 h-8 text-[var(--accent-primary)]" />
              <div>
                <h3 className="text-[15px] text-[var(--text-primary)] mb-1">
                  该休息了！
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  您已经专注工作了 {customMinutes} 分钟
                </p>
              </div>
            </div>
            <p className="text-[13px] text-[var(--text-tertiary)] mb-4 leading-relaxed">
              建议休息 5-10 分钟，活动一下身体，眺望远方放松眼睛。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBreakReminder(false);
                  resetPomodoro();
                }}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded text-[13px] text-white transition-colors"
              >
                开始休息
              </button>
              <button
                onClick={() => {
                  setShowBreakReminder(false);
                  setPomodoroActive(true);
                }}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded text-[13px] text-[var(--text-secondary)] transition-colors"
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
