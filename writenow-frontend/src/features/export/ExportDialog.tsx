/**
 * ExportDialog
 * Why: Provide a dialog for exporting documents in various formats (Markdown, DOCX, PDF).
 */

import { useCallback, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, FileText, FileType, X, Check, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { invoke } from '@/lib/rpc';

import { useExport, type ExportFormat } from './useExport';

interface ExportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Document title */
  title: string;
  /** Document content (markdown) */
  content: string;
}

const FORMAT_OPTIONS: Array<{
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'markdown',
    label: 'Markdown',
    description: '纯文本格式，便于编辑和版本控制',
    icon: <FileText size={20} />,
  },
  {
    id: 'docx',
    label: 'Word 文档',
    description: '标准 .docx 格式，适合进一步编辑',
    icon: <FileType size={20} />,
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: '便携文档格式，适合分享和打印',
    icon: <Download size={20} />,
  },
];

/**
 * ExportDialog component for document export.
 */
export function ExportDialog({ open, onOpenChange, title, content }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);
  const { exporting, result, error, exportDocument, clear } = useExport();

  const handleExport = useCallback(async () => {
    try {
      await exportDocument(selectedFormat, title, content);
    } catch {
      // Error is already handled in the hook
    }
  }, [selectedFormat, title, content, exportDocument]);

  const handleCopyPath = useCallback(async () => {
    if (!result?.path) return;
    try {
      await invoke('clipboard:writeText', { text: result.path });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to browser clipboard API
      try {
        await navigator.clipboard.writeText(result.path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore clipboard errors
      }
    }
  }, [result]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Clear state after dialog closes
    setTimeout(() => {
      clear();
      setCopied(false);
    }, 200);
  }, [onOpenChange, clear]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
    } else {
      onOpenChange(true);
    }
  }, [handleClose, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <Dialog.Title className="text-[13px] font-semibold text-[var(--fg-default)]">
                导出文档
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-colors"
                  aria-label="关闭"
                >
                  <X size={14} />
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Success State */}
              {result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20">
                    <Check size={20} className="text-[var(--success)]" />
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-[var(--fg-default)]">
                        导出成功
                      </div>
                      <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                        文件已保存到以下路径
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--fg-subtle)] mb-1">导出路径</div>
                    <div className="text-[11px] text-[var(--fg-default)] font-mono break-all">
                      {result.path}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleCopyPath()}
                      leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                      className="flex-1"
                    >
                      {copied ? '已复制' : '复制路径'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      完成
                    </Button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20">
                    <AlertCircle size={20} className="text-[var(--error)]" />
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-[var(--fg-default)]">
                        导出失败
                      </div>
                      <div className="text-[11px] text-[var(--error)] mt-0.5">
                        {error}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clear}
                      className="flex-1"
                    >
                      重试
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}

              {/* Format Selection */}
              {!result && !error && (
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-semibold text-[var(--fg-muted)] mb-2">
                      选择导出格式
                    </div>
                    <div className="space-y-2">
                      {FORMAT_OPTIONS.map((option) => (
                        <FormatOption
                          key={option.id}
                          {...option}
                          selected={selectedFormat === option.id}
                          onClick={() => setSelectedFormat(option.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      取消
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleExport()}
                      loading={exporting}
                      leftIcon={<Download size={14} />}
                      className="flex-1"
                    >
                      {exporting ? '导出中...' : '导出'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface FormatOptionProps {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

function FormatOption({ label, description, icon, selected, onClick }: FormatOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
        selected
          ? 'bg-[var(--accent-default)]/10 border-[var(--accent-default)]'
          : 'bg-[var(--bg-input)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-md',
          selected ? 'bg-[var(--accent-default)] text-[var(--fg-on-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--fg-muted)]'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-[var(--fg-default)]">{label}</div>
        <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">{description}</div>
      </div>
      <div
        className={cn(
          'w-4 h-4 rounded-full border-2 flex items-center justify-center',
          selected ? 'border-[var(--accent-default)] bg-[var(--accent-default)]' : 'border-[var(--border-default)]'
        )}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}
