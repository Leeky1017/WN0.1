/**
 * PublishView - 发布平台视图
 * Why: 管理发布平台连接和发布状态
 */

import { CheckCircle, Circle, Settings } from 'lucide-react';

interface Platform {
  id: number;
  name: string;
  connected: boolean;
  status: string;
  articles: number;
}

export function PublishView() {
  const platforms: Platform[] = [
    { id: 1, name: '微信公众号', connected: true, status: '已连接', articles: 12 },
    { id: 2, name: '知乎', connected: true, status: '已连接', articles: 8 },
    { id: 3, name: '小红书', connected: false, status: '未连接', articles: 0 },
    { id: 4, name: 'Medium', connected: false, status: '未连接', articles: 0 },
    { id: 5, name: '今日头条', connected: true, status: '已连接', articles: 15 },
  ];

  return (
    <>
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          发布平台
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="px-3 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors duration-[100ms]"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {platform.connected ? (
                  <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--fg-subtle)]" />
                )}
                <div>
                  <div className="text-[13px] text-[var(--fg-default)]">
                    {platform.name}
                  </div>
                  <div className="text-[10px] text-[var(--fg-subtle)]">
                    {platform.status}
                  </div>
                </div>
              </div>
              <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-active)] text-[var(--fg-subtle)] transition-colors duration-[100ms]">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {platform.connected && (
              <div className="text-[11px] text-[var(--fg-subtle)]">
                已发布 {platform.articles} 篇文章
              </div>
            )}

            {!platform.connected && (
              <button className="w-full mt-2 h-6 px-2 bg-[var(--accent-default)] hover:bg-[var(--accent-hover)] rounded-md text-[11px] text-[var(--fg-on-accent)] transition-colors duration-[100ms]">
                连接平台
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default PublishView;
