/**
 * ExportDialog
 * Why: Sprint Frontend V2 requires exporting writing results into multiple formats.
 *
 * Implementation notes:
 * - Markdown/HTML export is done client-side via Blob download for dev/browser friendliness.
 * - DOCX/PDF export is delegated to backend (`export:docx`, `export:pdf`) which may use pandoc when available.
 */

import { useCallback, useMemo, useState } from 'react';
import { FileCode2, FileText, FileType2, FileUp, Copy } from 'lucide-react';

import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Separator } from '@/components/ui';
import { invoke } from '@/lib/rpc';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeBaseName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Untitled';
  const invalid = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
  let out = '';
  for (const ch of trimmed) {
    const code = ch.charCodeAt(0);
    if (code >= 0 && code <= 31) {
      out += '_';
      continue;
    }
    out += invalid.has(ch) ? '_' : ch;
  }
  return out.slice(0, 100) || 'Untitled';
}

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  markdown: string;
  html: string;
  text: string;
}

export function ExportDialog(props: ExportDialogProps) {
  const { open, onOpenChange, title, markdown, html, text } = props;

  const baseName = useMemo(() => sanitizeBaseName(title), [title]);

  const [busy, setBusy] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBackendExport = useCallback(
    async (kind: 'docx' | 'pdf') => {
      setBusy(kind);
      setError(null);
      setResultPath(null);
      try {
        const response = await invoke(kind === 'docx' ? 'export:docx' : 'export:pdf', {
          title: baseName,
          content: markdown,
        });
        setResultPath(response.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : '导出失败');
      } finally {
        setBusy(null);
      }
    },
    [baseName, markdown],
  );

  const copyRich = useCallback(async () => {
    setBusy('copy');
    setError(null);
    setResultPath(null);
    try {
      if (!('clipboard' in navigator)) {
        throw new Error('Clipboard API 不可用');
      }
      const clipboardItemCtor = (window as unknown as { ClipboardItem?: unknown }).ClipboardItem;
      if (typeof clipboardItemCtor !== 'function') {
        // Fallback: plain text only.
        await navigator.clipboard.writeText(text);
        return;
      }

      const ClipboardItem = clipboardItemCtor as unknown as new (items: Record<string, Blob>) => ClipboardItem;
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制失败');
    } finally {
      setBusy(null);
    }
  }, [html, text]);

  const copyPath = useCallback(async () => {
    if (!resultPath) return;
    setBusy('copy-path');
    setError(null);
    try {
      if (!('clipboard' in navigator)) throw new Error('Clipboard API 不可用');
      await navigator.clipboard.writeText(resultPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制失败');
    } finally {
      setBusy(null);
    }
  }, [resultPath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>导出文档</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 hover:bg-[var(--bg-hover)]"
            onClick={() => downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), `${baseName}.md`)}
          >
            <FileText className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--text-primary)]">Markdown</div>
              <div className="text-xs text-[var(--text-muted)]">下载 .md 文件</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 hover:bg-[var(--bg-hover)] disabled:opacity-50"
            onClick={() => void runBackendExport('docx')}
            disabled={busy !== null}
          >
            <FileType2 className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--text-primary)]">Word</div>
              <div className="text-xs text-[var(--text-muted)]">生成 .docx（后端）</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 hover:bg-[var(--bg-hover)] disabled:opacity-50"
            onClick={() => void runBackendExport('pdf')}
            disabled={busy !== null}
          >
            <FileUp className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--text-primary)]">PDF</div>
              <div className="text-xs text-[var(--text-muted)]">生成 .pdf（后端）</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 hover:bg-[var(--bg-hover)]"
            onClick={() => downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${baseName}.html`)}
          >
            <FileCode2 className="w-5 h-5 text-[var(--text-muted)]" />
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--text-primary)]">HTML</div>
              <div className="text-xs text-[var(--text-muted)]">下载 .html 文件</div>
            </div>
          </button>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)]">
            {busy ? `正在处理：${busy}` : resultPath ? `已生成：${resultPath}` : error ? `错误：${error}` : '可下载或生成导出文件。'}
          </div>
          <div className="flex items-center gap-2">
            {resultPath && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copyPath()}
              >
                <Copy className="w-4 h-4 mr-2" />
                复制路径
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => void copyRich()} disabled={busy !== null}>
              <Copy className="w-4 h-4 mr-2" />
              复制富文本
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
