import React from 'react';
import { Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { usePomodoroStore } from '../stores/pomodoroStore';

export function PomodoroOverlay() {
  const { t } = useTranslation();
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
              <h3 className="text-[15px] text-[var(--text-primary)] mb-1">{t('pomodoro.overlay.breakTimeTitle')}</h3>
              <p className="text-[13px] text-[var(--text-secondary)]">
                {t('pomodoro.overlay.breakTimeDescription', { minutes: durations.focusMinutes })}
              </p>
            </div>
          </div>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4 leading-relaxed">
            {t('pomodoro.overlay.breakTimeHint')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => clearCompletion()}
              className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors"
            >
              {t('pomodoro.overlay.startBreak')}
            </button>
            <button
              onClick={() => {
                clearCompletion();
                stop();
                start();
              }}
              className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
            >
              {t('pomodoro.overlay.continueFocus')}
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
            <h3 className="text-[15px] text-[var(--text-primary)] mb-1">{t('pomodoro.overlay.breakOverTitle')}</h3>
            <p className="text-[13px] text-[var(--text-secondary)]">{t('pomodoro.overlay.breakOverDescription')}</p>
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
            {t('pomodoro.overlay.startFocus')}
          </button>
          <button
            onClick={() => clearCompletion()}
            className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
          >
            {t('common.later')}
          </button>
        </div>
      </div>
    </div>
  );
}
