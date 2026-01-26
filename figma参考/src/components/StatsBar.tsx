import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, Coffee, Play, Pause, X, Settings } from 'lucide-react';

interface StatsBarProps {
  onOpenStats: () => void;
}

export function StatsBar({ onOpenStats }: StatsBarProps) {
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);

  useEffect(() => {
    let interval: NodeJS.Timeout;
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

  return (
    <>
      <div className="h-8 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center px-4 gap-6">
        {/* Word Count - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2 py-1 -mx-2 rounded transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">1,234 字</span>
          <div className="w-20 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: '41%' }} />
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)]">/ 3,000</span>
        </button>

        {/* Reading Time - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2 py-1 -mx-2 rounded transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">约 5 分钟</span>
        </button>

        {/* Today's Progress - Clickable */}
        <button
          onClick={onOpenStats}
          className="flex items-center gap-2 hover:bg-[var(--bg-hover)] px-2 py-1 -mx-2 rounded transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <span className="text-[11px] text-[var(--text-secondary)]">今日 2,456 字</span>
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
            <span className={`text-[11px] font-mono ${pomodoroActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>
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
            <h3 className="text-[15px] text-[var(--text-primary)] mb-4">设置计时器</h3>
            <div className="mb-4">
              <label className="text-[13px] text-[var(--text-secondary)] mb-2 block">
                工作时长（分钟）
              </label>
              <input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
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
                <h3 className="text-[15px] text-[var(--text-primary)] mb-1">该休息了！</h3>
                <p className="text-[13px] text-[var(--text-secondary)]">您已经专注工作了 25 分钟</p>
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