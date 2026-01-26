import React from 'react';
import { CheckCircle, Circle, Settings } from 'lucide-react';

export function PublishView() {
  const platforms = [
    { id: 1, name: '微信公众号', connected: true, status: '已连接', articles: 12 },
    { id: 2, name: '知乎', connected: true, status: '已连接', articles: 8 },
    { id: 3, name: '小红书', connected: false, status: '未连接', articles: 0 },
    { id: 4, name: 'Medium', connected: false, status: '未连接', articles: 0 },
    { id: 5, name: '今日头条', connected: true, status: '已连接', articles: 15 },
  ];

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">发布平台</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="px-3 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {platform.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--text-tertiary)]" />
                )}
                <div>
                  <div className="text-[13px] text-[var(--text-primary)]">{platform.name}</div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">{platform.status}</div>
                </div>
              </div>
              <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-active)] text-[var(--text-tertiary)] transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {platform.connected && (
              <div className="text-[11px] text-[var(--text-tertiary)]">
                已发布 {platform.articles} 篇文章
              </div>
            )}
            
            {!platform.connected && (
              <button className="w-full mt-2 h-6 px-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded text-[11px] text-white transition-colors">
                连接平台
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
