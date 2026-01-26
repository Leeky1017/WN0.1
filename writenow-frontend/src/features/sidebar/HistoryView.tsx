/**
 * HistoryView - 版本历史视图
 * Why: 显示当前文件的版本历史，支持查看和恢复历史版本
 */

import { History, RotateCcw, Eye, Clock } from 'lucide-react';

interface HistoryViewProps {
  selectedFile: string | null;
}

interface VersionEntry {
  id: string;
  timestamp: Date;
  label: string;
  type: 'auto' | 'manual';
  wordCount?: number;
}

// 模拟版本历史数据
const mockVersions: VersionEntry[] = [
  {
    id: 'v5',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    label: '当前版本',
    type: 'auto',
    wordCount: 1234,
  },
  {
    id: 'v4',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    label: '自动保存',
    type: 'auto',
    wordCount: 1180,
  },
  {
    id: 'v3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    label: '手动保存',
    type: 'manual',
    wordCount: 1050,
  },
  {
    id: 'v2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    label: '自动保存',
    type: 'auto',
    wordCount: 890,
  },
  {
    id: 'v1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    label: '创建文件',
    type: 'manual',
    wordCount: 0,
  },
];

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${diffDays} 天前`;
}

export function HistoryView({ selectedFile }: HistoryViewProps) {
  return (
    <>
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">
          版本历史
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!selectedFile ? (
          <div className="p-4 text-center">
            <History className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--text-tertiary)]">
              选择文件后查看版本历史
            </p>
          </div>
        ) : (
          <div className="py-2">
            {/* 当前文件信息 */}
            <div className="px-3 py-2 mb-2 border-b border-[var(--border-subtle)]">
              <div className="text-[12px] text-[var(--text-secondary)] truncate">
                {selectedFile.split('/').pop()}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                {mockVersions.length} 个版本
              </div>
            </div>

            {/* 版本列表 */}
            <div className="space-y-1">
              {mockVersions.map((version, index) => (
                <div
                  key={version.id}
                  className={`group px-3 py-2 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${
                    index === 0 ? 'bg-[var(--bg-hover)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 ${
                        version.type === 'manual'
                          ? 'bg-[var(--accent-primary)]'
                          : 'bg-[var(--text-tertiary)]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--text-primary)]">
                          {version.label}
                        </span>
                        {index === 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)] text-white">
                            当前
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {formatRelativeTime(version.timestamp)}
                        </span>
                        {version.wordCount !== undefined && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            · {version.wordCount.toLocaleString()} 字
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 操作按钮 */}
                    {index > 0 && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-active)] transition-colors"
                          title="预览此版本"
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                        <button
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-active)] transition-colors"
                          title="恢复此版本"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - 说明 */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
        <div className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-primary)] mr-1 align-middle" />
          手动保存
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--text-tertiary)] ml-3 mr-1 align-middle" />
          自动保存
        </div>
      </div>
    </>
  );
}

export default HistoryView;
