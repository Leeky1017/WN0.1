/**
 * ContextPreview - Shows what context/memory will be injected into AI runs
 * Why: Allow users to understand and control what information is being sent to AI.
 *
 * Note: Expansion state is now controlled by parent (AIPanel header toggle).
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, RefreshCw, Info } from 'lucide-react';

import { IconButton } from '@/components/ui/icon-button';
import { invokeSafe } from '@/lib/rpc';
import type { MemoryInjectionPreviewResponse, UserMemory } from '@/types/ipc-generated';

interface ContextPreviewProps {
  projectId?: string;
}

const MEMORY_TYPE_LABELS: Record<string, string> = {
  preference: '偏好',
  feedback: '反馈',
  style: '风格',
};

function MemoryItem({ memory }: { memory: UserMemory }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = memory.content.length > 100;

  return (
    <div className="px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors">
      <div className="flex items-start gap-2">
        {isLong && (
          <button
            className="shrink-0 mt-0.5 text-[var(--fg-subtle)] hover:text-[var(--fg-default)]"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--fg-muted)] font-medium">
              {MEMORY_TYPE_LABELS[memory.type] ?? memory.type}
            </span>
            {memory.origin === 'learned' && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--accent-default)]/10 text-[var(--accent-default)] font-medium">
                学习
              </span>
            )}
          </div>
          <p className={`mt-1 text-[11px] text-[var(--fg-default)] break-words ${!expanded && isLong ? 'line-clamp-2' : ''}`}>
            {memory.content}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContextPreview({ projectId }: ContextPreviewProps) {
  const [preview, setPreview] = useState<MemoryInjectionPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invokeSafe('memory:injection:preview', { projectId });
      setPreview(res);
    } catch (err) {
      console.error('[ContextPreview] Failed to load:', err);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load preview on mount (since we're now always expanded when rendered)
  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const injectionEnabled = preview?.settings?.injectionEnabled ?? true;
  const memoryCount = preview?.injected?.memory?.length ?? 0;

  return (
    <div className="border-b border-[var(--border-subtle)]">
      {/* Content - always shown since parent controls visibility */}
      <div className="px-2 py-2">
        {/* Status Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              上下文预览
            </span>
            {memoryCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-default)]/10 text-[var(--accent-default)] font-medium">
                {memoryCount}
              </span>
            )}
            {injectionEnabled ? (
              <div className="flex items-center gap-1 text-[10px] text-[var(--fg-muted)]">
                <Eye size={10} className="text-[var(--success)]" />
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-[var(--warning)]">
                <EyeOff size={10} />
                <span>已禁用</span>
              </div>
            )}
          </div>
          <IconButton
            icon={RefreshCw}
            size="xs"
            variant="ghost"
            tooltip="刷新预览"
            onClick={() => void loadPreview()}
            disabled={loading}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-2 py-3 text-center text-[11px] text-[var(--fg-muted)]">
            正在加载…
          </div>
        )}

        {/* Empty State */}
        {!loading && memoryCount === 0 && (
          <div className="px-2 py-3 text-center">
            <div className="text-[11px] text-[var(--fg-muted)]">
              {injectionEnabled
                ? '当前没有会被注入的记忆'
                : '记忆注入已禁用，不会有记忆被注入'}
            </div>
            <div className="mt-1 text-[10px] text-[var(--fg-subtle)]">
              记忆帮助 AI 更好地理解你的偏好和风格
            </div>
          </div>
        )}

        {/* Memory List */}
        {!loading && memoryCount > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {preview?.injected?.memory?.map((m) => (
              <MemoryItem key={m.id} memory={m} />
            ))}
          </div>
        )}

        {/* Info */}
        {!loading && memoryCount > 0 && (
          <div className="mt-2 px-2 py-1.5 flex items-start gap-1.5 bg-[var(--bg-elevated)] rounded-md">
            <Info size={12} className="shrink-0 mt-0.5 text-[var(--fg-subtle)]" />
            <span className="text-[10px] text-[var(--fg-subtle)]">
              这些记忆将被注入到下一次 AI 运行的上下文中。你可以在「设置 → 记忆」中管理注入行为。
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContextPreview;
