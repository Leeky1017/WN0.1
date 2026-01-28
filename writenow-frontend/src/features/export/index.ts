/**
 * Export feature barrel export
 * Provides document export capabilities (Markdown, DOCX, PDF)
 */

export { ExportDialog } from './ExportDialog';
export { useExport } from './useExport';
export type { ExportFormat } from './useExport';

export type ExportOptions = {
  title: string;
  markdown: string;
  html: string;
  text: string;
};

/**
 * Download content as a file via Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Sanitize filename for filesystem safety
 */
export function sanitizeBaseName(name: string): string {
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

/**
 * Export content as markdown file (browser download)
 */
export function exportMarkdown(title: string, markdown: string): void {
  const baseName = sanitizeBaseName(title);
  downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), `${baseName}.md`);
}

/**
 * Export content as plain text file (browser download)
 */
export function exportText(title: string, text: string): void {
  const baseName = sanitizeBaseName(title);
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`);
}

/**
 * Export content as HTML file (browser download)
 */
export function exportHtml(title: string, html: string): void {
  const baseName = sanitizeBaseName(title);
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${baseName}.html`);
}
