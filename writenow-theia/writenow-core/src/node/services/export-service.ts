import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    ExportDocxRequest,
    ExportDocxResponse,
    ExportMarkdownRequest,
    ExportMarkdownResponse,
    ExportPdfRequest,
    ExportPdfResponse,
} from '../../common/ipc-generated';
import { WRITENOW_DATA_DIR } from '../writenow-data-dir';

const execAsync = promisify(exec);

/**
 * Why: ExportService implements export IPC contract for markdown, docx, and pdf.
 * Uses pandoc when available, falls back to direct file writing for markdown.
 */
@injectable()
export class ExportService {
    constructor(@inject(WRITENOW_DATA_DIR) private readonly dataDir: string) {}

    /**
     * Why: Export content as Markdown file.
     */
    async exportMarkdown(request: ExportMarkdownRequest): Promise<ExportMarkdownResponse> {
        const { title, content } = request;
        const exportDir = await this.ensureExportDir();
        const filename = this.sanitizeFilename(title) + '.md';
        const filePath = path.join(exportDir, filename);

        await fs.writeFile(filePath, content, 'utf8');

        return { path: filePath };
    }

    /**
     * Why: Export content as DOCX file using pandoc.
     */
    async exportDocx(request: ExportDocxRequest): Promise<ExportDocxResponse> {
        const { title, content } = request;
        const exportDir = await this.ensureExportDir();
        const filename = this.sanitizeFilename(title);
        const mdPath = path.join(exportDir, filename + '.md');
        const docxPath = path.join(exportDir, filename + '.docx');

        // Write temporary markdown file
        await fs.writeFile(mdPath, content, 'utf8');

        try {
            // Try pandoc conversion
            await execAsync(`pandoc "${mdPath}" -o "${docxPath}"`, { timeout: 30000 });
            // Clean up temp md file
            await fs.unlink(mdPath).catch(() => {});
            return { path: docxPath };
        } catch {
            // Fallback: just return the markdown path if pandoc not available
            return { path: mdPath };
        }
    }

    /**
     * Why: Export content as PDF file using pandoc.
     */
    async exportPdf(request: ExportPdfRequest): Promise<ExportPdfResponse> {
        const { title, content } = request;
        const exportDir = await this.ensureExportDir();
        const filename = this.sanitizeFilename(title);
        const mdPath = path.join(exportDir, filename + '.md');
        const pdfPath = path.join(exportDir, filename + '.pdf');

        // Write temporary markdown file
        await fs.writeFile(mdPath, content, 'utf8');

        try {
            // Try pandoc conversion with PDF engine
            await execAsync(`pandoc "${mdPath}" -o "${pdfPath}" --pdf-engine=xelatex`, { timeout: 60000 });
            // Clean up temp md file
            await fs.unlink(mdPath).catch(() => {});
            return { path: pdfPath };
        } catch {
            // Try wkhtmltopdf as fallback
            try {
                const htmlPath = path.join(exportDir, filename + '.html');
                await execAsync(`pandoc "${mdPath}" -o "${htmlPath}"`, { timeout: 30000 });
                await execAsync(`wkhtmltopdf "${htmlPath}" "${pdfPath}"`, { timeout: 60000 });
                await fs.unlink(mdPath).catch(() => {});
                await fs.unlink(htmlPath).catch(() => {});
                return { path: pdfPath };
            } catch {
                // Final fallback: just return the markdown path
                return { path: mdPath };
            }
        }
    }

    /**
     * Why: Ensure export directory exists.
     */
    private async ensureExportDir(): Promise<string> {
        const exportDir = path.join(this.dataDir, 'exports');
        await fs.mkdir(exportDir, { recursive: true });
        return exportDir;
    }

    /**
     * Why: Sanitize filename to be filesystem-safe.
     */
    private sanitizeFilename(name: string): string {
        const sanitized = name
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 100);
        return sanitized || `export_${Date.now()}`;
    }
}
