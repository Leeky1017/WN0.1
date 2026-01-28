import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, Target, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconButton } from '@/components/ui/icon-button';
import { useStatusBarStore } from '@/stores/statusBarStore';
import { useStats } from '@/lib/hooks/useStats';

/** Format minutes to human readable time (e.g., "1h 23m" or "45m") */
function formatTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

/** Calculate words per minute */
function calcWpm(wordCount: number, minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  return Math.round(wordCount / minutes);
}

/**
 * StatsBar - Writing session statistics display.
 *
 * Why popover: Keeps the header clean while providing detailed
 * stats on demand. Shows word count inline for quick reference.
 *
 * Layout: Single clickable stat that expands to show full dashboard.
 * Now integrated with backend stats:getToday for real data.
 */
export function StatsBar() {
  const wordCount = useStatusBarStore((s) => s.wordCount);
  const { todayStats, loading, refreshToday } = useStats();

  // Use backend stats if available, otherwise fallback to local store
  const displayWordCount = todayStats?.wordCount ?? wordCount;
  const writingMinutes = todayStats?.writingMinutes ?? 0;
  const articlesCreated = todayStats?.articlesCreated ?? 0;
  const skillsUsed = todayStats?.skillsUsed ?? 0;

  const wpm = useMemo(() => calcWpm(displayWordCount, writingMinutes), [displayWordCount, writingMinutes]);

  // Daily goal (could be configurable in future)
  const dailyGoal = 2000;
  const progress = Math.min(100, Math.round((displayWordCount / dailyGoal) * 100));

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-all text-[11px] font-medium text-[var(--fg-muted)] hover:text-[var(--fg-default)] group">
            <Target size={12} className="text-[var(--accent-default)]" />
            <span className="tabular-nums">{displayWordCount.toLocaleString()} 字</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-[var(--fg-default)]">今日统计</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  {todayStats?.date ?? '今日'}
                </span>
                <IconButton
                  icon={RefreshCw}
                  size="xs"
                  variant="ghost"
                  tooltip="刷新"
                  onClick={() => void refreshToday()}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--fg-subtle)] mb-1">
                  <Clock size={12} />
                  <span className="text-[10px] uppercase">写作时间</span>
                </div>
                <div className="text-lg font-mono text-[var(--fg-default)]">{formatTime(writingMinutes)}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--fg-subtle)] mb-1">
                  <Zap size={12} />
                  <span className="text-[10px] uppercase">WPM</span>
                </div>
                <div className="text-lg font-mono text-[var(--fg-default)]">{wpm}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--fg-subtle)] mb-1">
                  <FileText size={12} />
                  <span className="text-[10px] uppercase">新建文档</span>
                </div>
                <div className="text-lg font-mono text-[var(--fg-default)]">{articlesCreated}</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--fg-subtle)] mb-1">
                  <Sparkles size={12} />
                  <span className="text-[10px] uppercase">AI 调用</span>
                </div>
                <div className="text-lg font-mono text-[var(--fg-default)]">{skillsUsed}</div>
              </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between text-xs text-[var(--fg-muted)]">
                 <span>每日目标</span>
                 <span className="tabular-nums">{displayWordCount.toLocaleString()} / {dailyGoal.toLocaleString()}</span>
               </div>
               <div className="h-1.5 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-[var(--accent-default)] rounded-full"
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 0.5, ease: 'easeOut' }}
                 />
               </div>
               <div className="text-[10px] text-[var(--fg-subtle)] text-right">{progress}%</div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
