import React from 'react';
import { Coffee } from 'lucide-react';

import { usePomodoroStore } from '../stores/pomodoroStore';

export function PomodoroOverlay() {
  const lastCompletion = usePomodoroStore((s) => s.lastCompletion);
  const durations = usePomodoroStore((s) => s.durations);
  const clearCompletion = usePomodoroStore((s) => s.clearCompletion);
  const stop = usePomodoroStore((s) => s.stop);
  const start = usePomodoroStore((s) => s.start);

  if (!lastCompletion) return null;

  if (lastCompletion.phase === 'focus') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="wn-elevated p-6 max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <Coffee className="w-8 h-8 text-[var(--accent-primary)]" />
            <div>
              <h3 className="text-[15px] text-[var(--text-primary)] mb-1">该休息了！</h3>
              <p className="text-[13px] text-[var(--text-secondary)]">您已经专注工作了 {durations.focusMinutes} 分钟</p>
            </div>
          </div>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4 leading-relaxed">
            建议休息 5-10 分钟，活动一下身体，眺望远方放松眼睛。
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => clearCompletion()}
              className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors"
            >
              开始休息
            </button>
            <button
              onClick={() => {
                clearCompletion();
                stop();
                start();
              }}
              className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
            >
              继续专注
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="wn-elevated p-6 max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <Coffee className="w-8 h-8 text-[var(--accent-primary)]" />
          <div>
            <h3 className="text-[15px] text-[var(--text-primary)] mb-1">休息结束</h3>
            <p className="text-[13px] text-[var(--text-secondary)]">准备开始下一轮专注？</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              clearCompletion();
              start();
            }}
            className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors"
          >
            开始专注
          </button>
          <button
            onClick={() => clearCompletion()}
            className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
}

