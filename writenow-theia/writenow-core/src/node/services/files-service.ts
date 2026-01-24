import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    DocumentFileListItem,
    FileCreateRequest,
    FileCreateResponse,
    FileDeleteRequest,
    FileDeleteResponse,
    FileListRequest,
    FileListResponse,
    FileReadRequest,
    FileReadResponse,
    FileSessionStatusResponse,
    FileWriteRequest,
    FileWriteResponse,
    IpcErrorCode,
} from '../../common/ipc-generated';
import type { FilesServiceContract as FilesServiceContractShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { deleteArticle, upsertArticle } from '../database/articles';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { WRITENOW_DATA_DIR } from '../writenow-data-dir';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

function countWords(content: string): number {
    if (!content) return 0;
    return String(content).replace(/\s+/g, '').length;
}

function parseProjectId(raw: unknown): string | null {
    if (typeof raw === 'undefined') return null;
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
}

function assertValidProjectId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    if (!('projectId' in payload)) return null;
    const value = parseProjectId((payload as { projectId?: unknown }).projectId);
    if (!value) throw createIpcError('INVALID_ARGUMENT', 'Invalid projectId', { projectId: (payload as { projectId?: unknown }).projectId });
    return value;
}

function resolveDocumentFilePath(documentsDir: string, relativePath: unknown): { name: string; fullPath: string } {
    if (typeof relativePath !== 'string') throw new Error('Invalid path');
    const trimmed = relativePath.trim();
    if (!trimmed) throw new Error('Invalid path');

    const normalized = path.normalize(trimmed).replace(/^([/\\])+/, '');
    const base = path.basename(normalized);
    if (normalized !== base) throw new Error('Invalid path');
    if (base === '.' || base === '..') throw new Error('Invalid path');
    if (!base.toLowerCase().endsWith('.md')) throw new Error('Only .md files are supported');

    const fullPath = path.resolve(path.join(documentsDir, base));
    const documentsResolved = path.resolve(documentsDir);
    if (fullPath !== documentsResolved && !fullPath.startsWith(`${documentsResolved}${path.sep}`)) {
        throw new Error('Invalid path');
    }

    return { name: base, fullPath };
}

function sanitizeFileName(name: unknown): string {
    const raw = typeof name === 'string' ? name : '';
    let base = raw.trim();
    if (!base) base = '未命名';
    base = path.basename(base);
    base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    base = base.replace(/\s+/g, ' ').trim();
    if (!base.toLowerCase().endsWith('.md')) base += '.md';
    return base;
}

async function findAvailableFileName(documentsDir: string, fileName: string): Promise<string> {
    const ext = path.extname(fileName);
    const stem = path.basename(fileName, ext);

    let candidate = fileName;
    for (let i = 1; i < 1000; i += 1) {
        const fullPath = path.join(documentsDir, candidate);
        try {
            await fs.access(fullPath);
            candidate = `${stem} (${i})${ext}`;
        } catch {
            return candidate;
        }
    }
    throw new Error('Unable to create file');
}

function getDefaultMarkdownContent(fileName: string, template: FileCreateRequest['template']): string {
    if (template === 'blank') {
        return '';
    }
    const title = path.basename(fileName, path.extname(fileName));
    if (title === '欢迎使用') {
        return `# 欢迎使用 WriteNow\n\nWriteNow 是一款本地优先的写作工具：文件保存在本机，可审计、可复现。\n\n## 快速开始\n\n- 点击左侧「+」新建文章\n- 支持 Markdown 编辑，2 秒无操作自动保存\n\n祝你写作愉快！\n`;
    }
    return `# ${title}\n\n`;
}

@injectable()
export class FilesService implements FilesServiceContractShape {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WRITENOW_DATA_DIR) private readonly dataDir: string,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    async sessionStatus(): Promise<FileSessionStatusResponse> {
        return { uncleanExitDetected: false };
    }

    async list(request: FileListRequest): Promise<FileListResponse> {
        const scope = request?.scope;
        if (typeof scope !== 'undefined' && scope !== 'documents') {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid scope', { scope });
        }

        const documentsDir = path.join(this.dataDir, 'documents');
        await fs.mkdir(documentsDir, { recursive: true });

        const projectId = assertValidProjectId(request);

        const entries = await fs.readdir(documentsDir, { withFileTypes: true });
        const mdFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'));

        const items: DocumentFileListItem[] = await Promise.all(
            mdFiles.map(async (entry) => {
                const fullPath = path.join(documentsDir, entry.name);
                const stat = await fs.stat(fullPath);
                const content = await fs.readFile(fullPath, 'utf8').catch(() => '');
                const createdAt = stat.birthtimeMs || stat.ctimeMs || stat.mtimeMs || Date.now();
                return {
                    name: entry.name,
                    path: entry.name,
                    createdAt,
                    wordCount: countWords(content),
                };
            }),
        );

        items.sort((a, b) => b.createdAt - a.createdAt);

        if (projectId) {
            const db = this.sqliteDb.db;
            const rows = db.prepare("SELECT id FROM articles WHERE project_id = ? AND id LIKE '%.md'").all(projectId) as Array<{ id?: unknown }>;
            const allowed = new Set(rows.map((row) => (typeof row?.id === 'string' ? row.id : null)).filter(Boolean));
            return { items: items.filter((item) => allowed.has(item.path)) };
        }

        return { items };
    }

    async read(request: FileReadRequest): Promise<FileReadResponse> {
        const documentsDir = path.join(this.dataDir, 'documents');
        await fs.mkdir(documentsDir, { recursive: true });

        let resolved: { name: string; fullPath: string };
        try {
            resolved = resolveDocumentFilePath(documentsDir, request?.path);
        } catch {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: request?.path });
        }

        const content = await fs.readFile(resolved.fullPath, 'utf8');
        return { content, encoding: 'utf8' };
    }

    async write(request: FileWriteRequest): Promise<FileWriteResponse> {
        const documentsDir = path.join(this.dataDir, 'documents');
        await fs.mkdir(documentsDir, { recursive: true });

        let resolved: { name: string; fullPath: string };
        try {
            resolved = resolveDocumentFilePath(documentsDir, request?.path);
        } catch {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: request?.path });
        }

        const content = typeof request?.content === 'string' ? request.content : null;
        if (content === null) {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof request?.content });
        }

        await fs.access(resolved.fullPath);
        await fs.writeFile(resolved.fullPath, content, 'utf8');

        const db = this.sqliteDb.db;
        try {
            const projectId = assertValidProjectId(request);
            upsertArticle(db, { id: resolved.name, fileName: resolved.name, content, projectId });
        } catch (error) {
            this.logger.error(`[files] db index failed for write: ${resolved.name} (${error instanceof Error ? error.message : String(error)})`);
            throw createIpcError('DB_ERROR', 'Saved to disk but failed to update search index', {
                path: resolved.name,
                message: error instanceof Error ? error.message : String(error),
            });
        }

        return { written: true };
    }

    async create(request: FileCreateRequest): Promise<FileCreateResponse> {
        const documentsDir = path.join(this.dataDir, 'documents');
        await fs.mkdir(documentsDir, { recursive: true });

        const template = request?.template;
        if (typeof template !== 'undefined' && template !== 'default' && template !== 'blank') {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid template', { template });
        }

        const safeName = sanitizeFileName(request?.name);
        const fileName = await findAvailableFileName(documentsDir, safeName);
        const fullPath = path.join(documentsDir, fileName);
        const defaultContent = getDefaultMarkdownContent(fileName, template);

        await fs.writeFile(fullPath, defaultContent, { encoding: 'utf8', flag: 'wx' });

        const db = this.sqliteDb.db;
        try {
            const projectId = assertValidProjectId(request);
            upsertArticle(db, { id: fileName, fileName, content: defaultContent, projectId });
        } catch (error) {
            try {
                await fs.unlink(fullPath);
            } catch {
                // ignore
            }
            throw createIpcError('DB_ERROR', 'Failed to initialize search index for new file', {
                name: fileName,
                message: error instanceof Error ? error.message : String(error),
            });
        }

        return { name: fileName, path: fileName };
    }

    async delete(request: FileDeleteRequest): Promise<FileDeleteResponse> {
        const documentsDir = path.join(this.dataDir, 'documents');
        await fs.mkdir(documentsDir, { recursive: true });

        let resolved: { name: string; fullPath: string };
        try {
            resolved = resolveDocumentFilePath(documentsDir, request?.path);
        } catch {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: request?.path });
        }

        const db = this.sqliteDb.db;
        const existingContent = await fs.readFile(resolved.fullPath, 'utf8').catch(() => null);

        try {
            deleteArticle(db, resolved.name);
        } catch (error) {
            throw createIpcError('DB_ERROR', 'Failed to update search index for deleted file', {
                name: resolved.name,
                message: error instanceof Error ? error.message : String(error),
            });
        }

        try {
            await fs.unlink(resolved.fullPath);
        } catch (error) {
            if (typeof existingContent === 'string') {
                try {
                    upsertArticle(db, { id: resolved.name, fileName: resolved.name, content: existingContent });
                } catch {
                    // ignore
                }
            }
            throw error;
        }

        return { deleted: true };
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('file:session:status', async () => {
            return this.sessionStatus();
        });

        registry.handleInvoke('file:list', async (_evt, payload) => {
            return this.list(payload as FileListRequest);
        });

        registry.handleInvoke('file:read', async (_evt, payload) => {
            return this.read(payload as FileReadRequest);
        });

        registry.handleInvoke('file:write', async (_evt, payload) => {
            return this.write(payload as FileWriteRequest);
        });

        registry.handleInvoke('file:create', async (_evt, payload) => {
            return this.create(payload as FileCreateRequest);
        });

        registry.handleInvoke('file:delete', async (_evt, payload) => {
            return this.delete(payload as FileDeleteRequest);
        });
    }
}
