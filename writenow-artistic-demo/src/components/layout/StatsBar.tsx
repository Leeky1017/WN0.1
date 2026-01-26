import { motion } from 'framer-motion';
import { Clock, Zap, Target } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * StatsBar - Writing session statistics display.
 *
 * Why popover: Keeps the header clean while providing detailed
 * stats on demand. Shows word count inline for quick reference.
 *
 * Layout: Single clickable stat that expands to show full dashboard.
 */
export function StatsBar() {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-all text-[11px] font-medium text-[var(--fg-muted)] hover:text-[var(--fg-default)] group">
            <Target size={12} className="text-[var(--accent-default)]" />
            <span className="tabular-nums">1,204 words</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-[var(--fg-default)]">Session Stats</h4>
              <span className="text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">Live</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--fg-subtle)] mb-1">
                  <Clock size={12} />
                  <span className="text-[10px] uppercase">Time</span>
                </div>
                <div className="text-lg font-mono text-[var(--fg-default)]">45m</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--fg-subtle)] mb-1">
                  <Zap size={12} />
                  <span className="text-[10px] uppercase">WPM</span>
                </div>
                <div className="text-lg font-mono text-[var(--fg-default)]">26</div>
              </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between text-xs text-[var(--fg-muted)]">
                 <span>Daily Goal</span>
                 <span className="tabular-nums">1,204 / 2,000</span>
               </div>
               <div className="h-1.5 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-[var(--accent-default)] rounded-full"
                   initial={{ width: 0 }}
                   animate={{ width: '60%' }}
                   transition={{ duration: 1, delay: 0.2 }}
                 />
               </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
