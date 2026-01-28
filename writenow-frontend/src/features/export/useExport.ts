/**
 * useExport hook
 * Why: Encapsulate export operations via IPC (export:markdown, export:docx, export:pdf).
 */

import { useCallback, useState } from 'react';
import { invoke } from '@/lib/rpc';

export type ExportFormat = 'markdown' | 'docx' | 'pdf';

export interface ExportResult {
  format: ExportFormat;
  path: string;
}

export interface UseExportResult {
  /** Exporting state */
  exporting: boolean;
  /** Last export result */
  result: ExportResult | null;
  /** Error message if export failed */
  error: string | null;
  /** Export document to specified format */
  exportDocument: (format: ExportFormat, title: string, content: string) => Promise<ExportResult>;
  /** Clear result and error */
  clear: () => void;
}

/**
 * Hook for document export operations.
 * Uses IPC channels for DOCX and PDF export (requires backend support).
 */
export function useExport(): UseExportResult {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportDocument = useCallback(async (format: ExportFormat, title: string, content: string): Promise<ExportResult> => {
    setExporting(true);
    setError(null);
    setResult(null);

    try {
      let path: string;

      switch (format) {
        case 'markdown': {
          const response = await invoke('export:markdown', { title, content });
          path = response.path;
          break;
        }
        case 'docx': {
          const response = await invoke('export:docx', { title, content });
          path = response.path;
          break;
        }
        case 'pdf': {
          const response = await invoke('export:pdf', { title, content });
          path = response.path;
          break;
        }
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      const exportResult: ExportResult = { format, path };
      setResult(exportResult);
      return exportResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      setError(message);
      throw err;
    } finally {
      setExporting(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    exporting,
    result,
    error,
    exportDocument,
    clear,
  };
}
