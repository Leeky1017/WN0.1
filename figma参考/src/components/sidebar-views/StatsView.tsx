import React from 'react';
import { TrendingUp, Clock, Award } from 'lucide-react';

export function StatsView() {
  const weeklyData = [
    { day: '一', count: 1200 },
    { day: '二', count: 800 },
    { day: '三', count: 2100 },
    { day: '四', count: 1500 },
    { day: '五', count: 2800 },
    { day: '六', count: 900 },
    { day: '日', count: 1600 },
  ];

  const maxCount = Math.max(...weeklyData.map(d => d.count));

  return (
    <>
      <div className="h-11 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
        <span className="text-[13px] text-[var(--text-primary)]">创作统计</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Hero Stats */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-light text-[var(--text-primary)] tabular-nums">1,234</span>
            <span className="text-[13px] text-[var(--text-tertiary)]">字</span>
          </div>
          <div className="h-px bg-[var(--border-default)]" />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--text-tertiary)]">目标进度</span>
            <span className="text-[var(--text-secondary)] tabular-nums">41%</span>
          </div>
          <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent-primary)] transition-all" style={{ width: '41%' }} />
          </div>
        </div>

        {/* Today */}
        <div className="space-y-2">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">今日</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[20px] font-light text-[var(--text-primary)] tabular-nums">2,456</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">字数</div>
            </div>
            <div>
              <div className="text-[20px] font-light text-[var(--text-primary)] tabular-nums">5 min</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">阅读时长</div>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="space-y-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">本周</div>
          <div className="flex items-end justify-between gap-1.5 h-28">
            {weeklyData.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col gap-1.5">
                <div className="flex-1 bg-[var(--bg-secondary)] rounded-sm relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[var(--accent-primary)] opacity-80 transition-all"
                    style={{ height: `${(data.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] text-center">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overall */}
        <div className="space-y-3">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">总计</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-[13px] text-[var(--text-secondary)]">总字数</span>
              <span className="text-[15px] text-[var(--text-primary)] tabular-nums">45,234</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-[13px] text-[var(--text-secondary)]">总时长</span>
              <span className="text-[15px] text-[var(--text-primary)] tabular-nums">28 小时</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)]">
              <span className="text-[13px] text-[var(--text-secondary)]">文章数</span>
              <span className="text-[15px] text-[var(--text-primary)] tabular-nums">23</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[13px] text-[var(--text-secondary)]">连续天数</span>
              <span className="text-[15px] text-[var(--text-primary)] tabular-nums">12 天</span>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="space-y-3 pb-4">
          <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">月度趋势</div>
          <div className="space-y-2">
            {[
              { month: '1月', count: 12000, trend: '+15%' },
              { month: '2月', count: 15000, trend: '+25%' },
              { month: '3月', count: 18000, trend: '+20%' },
            ].map((data) => (
              <div key={data.month} className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--text-tertiary)] w-8">{data.month}</span>
                <div className="flex-1 h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 opacity-60" 
                    style={{ width: `${(data.count / 20000) * 100}%` }} 
                  />
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] tabular-nums w-16 text-right">{data.count.toLocaleString()}</span>
                <span className="text-[10px] text-green-500 w-10 text-right">{data.trend}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
