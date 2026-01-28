/**
 * CrashRecoveryDialog - Recovery prompt after unclean exit
 * Why: Allow users to recover unsaved work after a crash or unclean shutdown.
 */

import { useCallback, useState } from 'react';
import { AlertTriangle, FileText, Clock, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useCrashRecovery } from './useCrashRecovery';

interface CrashRecoveryDialogProps {
  onRecovered?: (path: string, content: string) => void;
}

export function CrashRecoveryDialog({ onRecovered }: CrashRecoveryDialogProps) {
  const {
    uncleanExitDetected,
    latestSnapshot,
    loading,
    error,
    recover,
    dismiss,
  } = useCrashRecovery();

  const [recovering, setRecovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleRecover = useCallback(async () => {
    setRecovering(true);
    const result = await recover();
    setRecovering(false);

    if (result && onRecovered) {
      onRecovered(result.path, result.content);
    }
  }, [recover, onRecovered]);

  // Don't show if no unclean exit or loading
  if (loading || !uncleanExitDetected) {
    return null;
  }

  const snapshotTime = latestSnapshot
    ? new Date(latestSnapshot.createdAt).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const fileName = latestSnapshot?.path
    ? latestSnapshot.path.split('/').pop() ?? latestSnapshot.path
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[var(--bg-surface)] rounded-xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--warning)]/10 border-b border-[var(--warning)]/30 flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-[var(--warning)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold text-[var(--fg-default)]">检测到未保存的内容</h2>
            <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
              上次会话可能未正常关闭，我们找到了可恢复的内容。
            </p>
          </div>
          <button
            className="shrink-0 p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
            onClick={dismiss}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Snapshot Info */}
          {latestSnapshot ? (
            <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--fg-default)]">
                <FileText size={14} className="text-[var(--accent-default)]" />
                <span className="truncate">{fileName}</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--fg-muted)]">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{snapshotTime}</span>
                </div>
                <div>
                  <span>{latestSnapshot.content.length.toLocaleString()} 字符</span>
                </div>
                <div>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--fg-subtle)]">
                    {latestSnapshot.reason === 'auto' ? '自动保存' : '手动保存'}
                  </span>
                </div>
              </div>

              {/* Preview Toggle */}
              <div className="mt-3">
                <button
                  className="text-[11px] text-[var(--accent-default)] hover:underline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? '隐藏预览' : '预览内容'}
                </button>
                {showPreview && (
                  <pre className="mt-2 p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-muted)] max-h-32 overflow-auto whitespace-pre-wrap break-words">
                    {latestSnapshot.content.slice(0, 1000)}
                    {latestSnapshot.content.length > 1000 && '\n... (内容已截断)'}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[12px] text-[var(--fg-muted)]">
              未找到可恢复的快照。
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-2 rounded-md bg-[var(--error)]/10 border border-[var(--error)]/30 text-[11px] text-[var(--error)]">
              {error}
            </div>
          )}

          {/* Help Text */}
          <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
            <strong>恢复</strong>：将快照内容写回原文件，覆盖当前内容。
            <br />
            <strong>丢弃</strong>：忽略此快照，继续使用当前文件内容。
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss} disabled={recovering}>
            丢弃
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleRecover()}
            loading={recovering}
            disabled={!latestSnapshot}
            leftIcon={<RefreshCw size={14} />}
          >
            恢复内容
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CrashRecoveryDialog;
