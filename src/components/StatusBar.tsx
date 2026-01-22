import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Clock, Coffee, Pause, Play, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useEditorStore } from '../stores/editorStore';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { useStatsStore } from '../stores/statsStore';
import { WnButton, WnDialog, WnInput, WnPanel } from './wn';

export type StatusBarProps = {
  focusMode: boolean;
  onOpenStats?: () => void;
};

function formatNumber(value: number, locale: string) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)).toLocaleString(locale) : '0';
}

function formatTimer(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Why: Consolidate all low-frequency status into a single, ultra-thin bottom bar (≤24px)
 * with progressive disclosure, so the main layout can stay vertically continuous.
 */
export function StatusBar({ focusMode, onOpenStats }: StatusBarProps) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const numberLocale = i18n.language;

  const [isExpanded, setIsExpanded] = useState(false);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [focusMinutesDraft, setFocusMinutesDraft] = useState(25);
  const [breakMinutesDraft, setBreakMinutesDraft] = useState(5);

  const activeTab = useEditorStore((s) => (s.activeTabId ? s.tabStateById[s.activeTabId] ?? null : null));
  const content = activeTab?.content ?? '';
  const currentPath = activeTab?.path ?? null;
  const isDirty = activeTab?.isDirty ?? false;
  const saveStatus = activeTab?.saveStatus ?? 'saved';
  const lastSavedAt = activeTab?.lastSavedAt ?? null;

  const today = useStatsStore((s) => s.today);
  const dailyGoal = useStatsStore((s) => s.dailyWordGoal);
  const refreshToday = useStatsStore((s) => s.refreshToday);

  const pomodoroStatus = usePomodoroStore((s) => s.status);
  const pomodoroPhase = usePomodoroStore((s) => s.phase);
  const remainingMs = usePomodoroStore((s) => s.remainingMs);
  const durations = usePomodoroStore((s) => s.durations);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const stop = usePomodoroStore((s) => s.stop);
  const setDurations = usePomodoroStore((s) => s.setDurations);

  useEffect(() => {
    refreshToday().catch(() => undefined);
  }, [refreshToday]);

  useEffect(() => {
    if (!lastSavedAt) return;
    refreshToday().catch(() => undefined);
  }, [lastSavedAt, refreshToday]);

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    if (timerDialogOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setIsExpanded(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isExpanded, timerDialogOpen]);

  const saveLabel = useMemo(() => {
    if (!currentPath) return '—';
    if (saveStatus === 'saving') return t('editor.save.saving');
    if (saveStatus === 'error') return t('editor.save.error');
    if (isDirty) return t('editor.save.unsaved');
    return t('editor.save.saved');
  }, [currentPath, isDirty, saveStatus, t]);

  const lineCount = useMemo(() => content.split('\n').length, [content]);
  const charCount = content.length;
  const fileLabel = useMemo(() => {
    if (!currentPath) return t('editor.noFileSelected.title');
    const base = currentPath.split(/[/\\\\]/).pop();
    return base || currentPath;
  }, [currentPath, t]);

  const wordCount = today?.wordCount ?? 0;
  const goalProgress = useMemo(() => {
    const goal = Math.max(1, dailyGoal);
    return Math.round(Math.min(1, Math.max(0, wordCount / goal)) * 100);
  }, [dailyGoal, wordCount]);

  const timerLabel = formatTimer(remainingMs);
  const phaseLabel = pomodoroPhase === 'break' ? t('pomodoro.phase.break') : t('pomodoro.phase.focus');
  const phaseColor = pomodoroPhase === 'break' ? 'var(--wn-color-teal-500)' : 'var(--wn-accent-primary)';

  const canExpand = !focusMode;

  return (
    <div ref={containerRef} className="relative" data-zen-chrome>
      {isExpanded && canExpand && (
        <div className="absolute bottom-6 left-3 right-3 z-40">
          <WnPanel padding="sm" className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--text-tertiary)] mb-2">{t('statusBar.today')}</div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenStats?.()}
                  className="flex items-center gap-2 h-7 px-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    {t('statusBar.wordCount', { count: formatNumber(wordCount, numberLocale) })}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">({goalProgress}%)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Coffee className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <button
                  type="button"
                  onClick={() => {
                    if (pomodoroStatus === 'running') pause();
                    else start();
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {pomodoroStatus === 'running' ? (
                    <Pause className="w-3 h-3 text-[var(--text-secondary)]" />
                  ) : (
                    <Play className="w-3 h-3 text-[var(--text-secondary)]" />
                  )}
                  <span className="text-[10px]" style={{ color: phaseColor }}>
                    {phaseLabel}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums" style={{ color: phaseColor }}>
                    {timerLabel}
                  </span>
                </button>
              </div>

              <WnButton
                size="icon"
                variant="ghost"
                aria-label={t('statusBar.timerSettingsAria')}
                onClick={() => {
                  setFocusMinutesDraft(durations.focusMinutes);
                  setBreakMinutesDraft(durations.breakMinutes);
                  setTimerDialogOpen(true);
                }}
              >
                <Settings className="w-4 h-4" />
              </WnButton>

              <WnButton
                size="icon"
                variant="ghost"
                aria-label={t('statusBar.stopTimerAria')}
                onClick={() => stop()}
                isDisabled={pomodoroStatus === 'idle'}
              >
                <Clock className="w-4 h-4" />
              </WnButton>
            </div>
          </WnPanel>
        </div>
      )}

      <div
        data-testid="statusbar"
        className="h-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center justify-between px-3 text-[11px] text-[var(--text-tertiary)]"
        onDoubleClick={() => {
          if (!canExpand) return;
          setIsExpanded(false);
        }}
      >
        {focusMode ? (
          <div className="flex items-center gap-2">
            <span>{saveLabel}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <span className="truncate text-[var(--text-secondary)]">{fileLabel}</span>
              <span className="truncate">{saveLabel}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                {t('statusBar.lineAndChars', { lines: lineCount, chars: formatNumber(charCount, numberLocale) })}
              </span>
              <button
                type="button"
                onClick={() => onOpenStats?.()}
                className="tabular-nums hover:text-[var(--text-secondary)] transition-colors"
                title={t('statusBar.openStatsTitle')}
              >
                {t('statusBar.wordsAndProgress', { words: formatNumber(wordCount, numberLocale), progress: goalProgress })}
              </button>
              <span className="tabular-nums" style={{ color: phaseColor }}>
                {timerLabel}
              </span>
              <button
                type="button"
                className="wn-icon-btn"
                onClick={() => {
                  if (!canExpand) return;
                  setIsExpanded((v) => !v);
                }}
                aria-label={isExpanded ? t('statusBar.collapseAria') : t('statusBar.expandAria')}
                title={isExpanded ? t('statusBar.collapseTitle') : t('statusBar.expandTitle')}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      <WnDialog
        isOpen={timerDialogOpen}
        onOpenChange={setTimerDialogOpen}
        title={t('pomodoro.settings.title')}
        description={t('pomodoro.settings.description')}
        footer={
          <div className="flex gap-2">
            <WnButton
              variant="primary"
              className="flex-1"
              onClick={() => {
                setDurations({ focusMinutes: focusMinutesDraft, breakMinutes: breakMinutesDraft });
                setTimerDialogOpen(false);
              }}
            >
              {t('common.apply')}
            </WnButton>
            <WnButton variant="secondary" className="flex-1" onClick={() => setTimerDialogOpen(false)}>
              {t('common.cancel')}
            </WnButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="wn-timer-focus" className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t('pomodoro.settings.focusMinutesLabel')}
            </label>
            <WnInput
              id="wn-timer-focus"
              type="number"
              min={1}
              max={120}
              value={focusMinutesDraft}
              onChange={(e) => setFocusMinutesDraft(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <label htmlFor="wn-timer-break" className="text-[12px] text-[var(--text-secondary)] block mb-1">
              {t('pomodoro.settings.breakMinutesLabel')}
            </label>
            <WnInput
              id="wn-timer-break"
              type="number"
              min={1}
              max={60}
              value={breakMinutesDraft}
              onChange={(e) => setBreakMinutesDraft(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            />
          </div>
        </div>
      </WnDialog>
    </div>
  );
}
