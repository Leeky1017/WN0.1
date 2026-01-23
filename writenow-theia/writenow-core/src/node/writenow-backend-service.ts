import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { ILogger } from '@theia/core/lib/common/logger';
import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    DocumentFileListItem,
    DocumentSnapshot,
    FileCreateRequest,
    FileCreateResponse,
    FileDeleteRequest,
    FileDeleteResponse,
    FileListRequest,
    FileListResponse,
    FileReadRequest,
    FileReadResponse,
    FileSessionStatusResponse,
    FileSnapshotLatestRequest,
    FileSnapshotLatestResponse,
    FileSnapshotWriteRequest,
    FileSnapshotWriteResponse,
    FileWriteRequest,
    FileWriteResponse,
    IpcChannel,
    IpcErrorCode,
    IpcResponse,
    Project,
    ProjectBootstrapResponse,
    ProjectCreateRequest,
    ProjectCreateResponse,
    ProjectDeleteRequest,
    ProjectDeleteResponse,
    ProjectGetCurrentResponse,
    ProjectListResponse,
    ProjectSetCurrentRequest,
    ProjectSetCurrentResponse,
    ProjectUpdateRequest,
    ProjectUpdateResponse,
    SnapshotReason,
} from '../common/ipc-generated';
import type { WritenowRpcService } from '../common/writenow-protocol';

import { TheiaInvokeRegistry, toIpcError } from './theia-invoke-adapter';
import { WRITENOW_DATA_DIR } from './writenow-data-dir';

type ProjectIndexFileV1 = {
    version: 1;
    currentProjectId: string | null;
    projects: Project[];
};

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

function nowIso(): string {
    return new Date().toISOString();
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFileOrNull<T>(filePath: string): Promise<T | null> {
    const raw = await fs.readFile(filePath, 'utf8').catch((error: unknown) => {
        const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
        if (code === 'ENOENT') return null;
        throw error;
    });

    if (raw === null) {
        return null;
    }

    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        throw createIpcError('IO_ERROR', 'Invalid JSON', { filePath, message: error instanceof Error ? error.message : String(error) });
    }
}

async function atomicWriteJsonFile(filePath: string, value: unknown): Promise<void> {
    const dir = path.dirname(filePath);
    await ensureDir(dir);

    const tmpName = `${path.basename(filePath)}.${randomUUID()}.tmp`;
    const tmpPath = path.join(dir, tmpName);
    await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf8');
    await fs.rename(tmpPath, filePath);
}

function validateProjectName(value: unknown): string {
    const name = coerceString(value);
    if (!name) {
        throw createIpcError('INVALID_ARGUMENT', 'name is required');
    }
    if (name.length > 120) {
        throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });
    }
    return name;
}

function requireProjectId(value: unknown, field: string): string {
    const id = coerceString(value);
    if (!id) {
        throw createIpcError('INVALID_ARGUMENT', `${field} is required`, { field });
    }
    return id;
}

function resolveDocumentFileName(relativePath: unknown): string {
    const raw = coerceString(relativePath);
    if (!raw) {
        throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: relativePath });
    }

    const normalized = path.normalize(raw).replace(/^([/\\])+/, '');
    const base = path.basename(normalized);
    if (normalized !== base) {
        throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: relativePath });
    }
    if (base === '.' || base === '..') {
        throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: relativePath });
    }
    if (!base.toLowerCase().endsWith('.md')) {
        throw createIpcError('INVALID_ARGUMENT', 'Only .md files are supported', { path: relativePath });
    }

    return base;
}

function sanitizeFileName(input: unknown): string {
    const raw = typeof input === 'string' ? input : '';
    let base = raw.trim();
    if (!base) base = '未命名';
    base = path.basename(base);
    base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    base = base.replace(/\s+/g, ' ').trim();
    if (!base.toLowerCase().endsWith('.md')) {
        base += '.md';
    }
    return base;
}

function countWords(content: string): number {
    if (!content) return 0;
    return content.replace(/\s+/g, '').length;
}

async function findAvailableFileName(dirPath: string, desiredName: string): Promise<string> {
    const ext = path.extname(desiredName);
    const stem = path.basename(desiredName, ext);

    let candidate = desiredName;
    for (let i = 1; i < 1000; i += 1) {
        const fullPath = path.join(dirPath, candidate);
        if (!(await pathExists(fullPath))) {
            return candidate;
        }
        candidate = `${stem} (${i})${ext}`;
    }

    throw createIpcError('IO_ERROR', 'Unable to create file');
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

function sanitizeSnapshotPrefix(docName: string): string {
    const raw = typeof docName === 'string' ? docName : '';
    let base = raw.trim();
    base = path.basename(base);
    base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    return base;
}

function formatSnapshotTimestamp(ts: number): string {
    return new Date(ts).toISOString().replace(/[:.]/g, '-');
}

function buildSnapshotFileName(docName: string, createdAt: number): string {
    const safeDocName = sanitizeSnapshotPrefix(docName);
    const stamp = formatSnapshotTimestamp(createdAt);
    const rand = Math.random().toString(16).slice(2, 10);
    return `${safeDocName}__${stamp}__${rand}.json`;
}

function isSnapshotFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.json');
}

function buildSnapshotModel(fileName: string, payload: unknown): DocumentSnapshot | null {
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as { path?: unknown; createdAt?: unknown; reason?: unknown; content?: unknown };

    const docPath = coerceString(record.path);
    const createdAt = typeof record.createdAt === 'number' ? record.createdAt : null;
    const reason = record.reason === 'auto' || record.reason === 'manual' ? record.reason : null;
    const content = typeof record.content === 'string' ? record.content : null;

    if (!docPath) return null;
    if (createdAt === null) return null;
    if (reason === null) return null;
    if (content === null) return null;

    return { id: fileName, path: docPath, createdAt, reason, content };
}

@injectable()
export class WritenowBackendService implements WritenowRpcService {
    private readonly registry = new TheiaInvokeRegistry();

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WRITENOW_DATA_DIR) private readonly dataDir: string,
    ) {
        this.registerProjectHandlers();
        this.registerFileHandlers();
    }

    async invoke(channel: IpcChannel, payload: unknown): Promise<IpcResponse<unknown>> {
        const handler = this.registry.get(channel);
        if (!handler) {
            return { ok: false, error: { code: 'NOT_FOUND', message: 'IPC channel not found', details: { channel } } };
        }

        try {
            const data = await handler(undefined, payload);
            return { ok: true, data };
        } catch (error) {
            const ipcError = toIpcError(error);
            this.logger.error(`[writenow-rpc] invoke failed: ${channel} (${ipcError.code})`);
            return { ok: false, error: ipcError };
        }
    }

    private getProjectIndexPath(): string {
        return path.join(this.dataDir, 'project-index.json');
    }

    private getProjectsRoot(): string {
        return path.join(this.dataDir, 'projects');
    }

    private getProjectRoot(projectId: string): string {
        return path.join(this.getProjectsRoot(), projectId);
    }

    private getDocumentsDir(): string {
        return path.join(this.dataDir, 'documents');
    }

    private getSnapshotsDir(): string {
        return path.join(this.dataDir, 'snapshots');
    }

    private async readProjectIndex(): Promise<ProjectIndexFileV1> {
        await ensureDir(this.dataDir);
        const existing = await readJsonFileOrNull<ProjectIndexFileV1>(this.getProjectIndexPath());
        if (!existing) {
            return { version: 1, currentProjectId: null, projects: [] };
        }

        if (existing.version !== 1 || !Array.isArray(existing.projects)) {
            throw createIpcError('IO_ERROR', 'Invalid project index', { filePath: this.getProjectIndexPath() });
        }

        const currentProjectId = typeof existing.currentProjectId === 'string' ? existing.currentProjectId : null;
        const projects = existing.projects.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string');
        return { version: 1, currentProjectId, projects };
    }

    private async writeProjectIndex(next: ProjectIndexFileV1): Promise<void> {
        await atomicWriteJsonFile(this.getProjectIndexPath(), next);
    }

    private async ensureProjectFolder(projectId: string): Promise<void> {
        const projectRoot = this.getProjectRoot(projectId);
        await ensureDir(this.getProjectsRoot());
        await ensureDir(projectRoot);
        await ensureDir(path.join(projectRoot, '.writenow'));
    }

    private registerProjectHandlers(): void {
        this.registry.handleInvoke('project:bootstrap', async () => {
            const index = await this.readProjectIndex();
            if (index.projects.length > 0 && index.currentProjectId) {
                return { createdDefault: false, currentProjectId: index.currentProjectId, migratedArticles: 0 } satisfies ProjectBootstrapResponse;
            }

            const id = randomUUID();
            const now = nowIso();
            const project: Project = {
                id,
                name: '默认项目',
                createdAt: now,
                updatedAt: now,
            };

            await this.ensureProjectFolder(id);

            const next: ProjectIndexFileV1 = {
                version: 1,
                currentProjectId: id,
                projects: [project],
            };
            await this.writeProjectIndex(next);

            return { createdDefault: true, currentProjectId: id, migratedArticles: 0 } satisfies ProjectBootstrapResponse;
        });

        this.registry.handleInvoke('project:list', async () => {
            const index = await this.readProjectIndex();
            const projects = [...index.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            return { projects } satisfies ProjectListResponse;
        });

        this.registry.handleInvoke('project:getCurrent', async () => {
            const index = await this.readProjectIndex();
            const current = index.currentProjectId;
            return { projectId: current } satisfies ProjectGetCurrentResponse;
        });

        this.registry.handleInvoke('project:setCurrent', async (_evt, payload) => {
            const req = payload as ProjectSetCurrentRequest;
            const projectId = requireProjectId(req?.projectId, 'projectId');

            const index = await this.readProjectIndex();
            const exists = index.projects.some((p) => p.id === projectId);
            if (!exists) {
                throw createIpcError('NOT_FOUND', 'Project not found', { projectId });
            }

            const next: ProjectIndexFileV1 = { ...index, currentProjectId: projectId };
            await this.writeProjectIndex(next);
            return { projectId } satisfies ProjectSetCurrentResponse;
        });

        this.registry.handleInvoke('project:create', async (_evt, payload) => {
            const req = payload as ProjectCreateRequest;
            const name = validateProjectName(req?.name);
            const description = coerceString(req?.description) || undefined;
            const styleGuide = coerceString(req?.styleGuide) || undefined;

            const id = randomUUID();
            const now = nowIso();
            const project: Project = {
                id,
                name,
                ...(description ? { description } : {}),
                ...(styleGuide ? { styleGuide } : {}),
                createdAt: now,
                updatedAt: now,
            };

            await this.ensureProjectFolder(id);

            const index = await this.readProjectIndex();
            const next: ProjectIndexFileV1 = {
                version: 1,
                currentProjectId: id,
                projects: [project, ...index.projects],
            };

            await this.writeProjectIndex(next);
            return { project, currentProjectId: id } satisfies ProjectCreateResponse;
        });

        this.registry.handleInvoke('project:update', async (_evt, payload) => {
            const req = payload as ProjectUpdateRequest;
            const id = requireProjectId(req?.id, 'id');

            const name = typeof req?.name === 'string' ? req.name.trim() : undefined;
            const description = typeof req?.description === 'string' ? req.description.trim() : undefined;
            const styleGuide = typeof req?.styleGuide === 'string' ? req.styleGuide.trim() : undefined;

            if (typeof name === 'string' && !name) {
                throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty');
            }
            if (typeof name === 'string' && name.length > 120) {
                throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });
            }

            if (typeof name === 'undefined' && typeof description === 'undefined' && typeof styleGuide === 'undefined') {
                throw createIpcError('INVALID_ARGUMENT', 'No fields to update');
            }

            const index = await this.readProjectIndex();
            const existing = index.projects.find((p) => p.id === id);
            if (!existing) {
                throw createIpcError('NOT_FOUND', 'Project not found', { id });
            }

            const nextProject: Project = {
                ...existing,
                ...(typeof name === 'string' ? { name } : {}),
                ...(typeof description === 'string' ? { description: description || undefined } : {}),
                ...(typeof styleGuide === 'string' ? { styleGuide: styleGuide || undefined } : {}),
                updatedAt: nowIso(),
            };

            const next: ProjectIndexFileV1 = {
                ...index,
                projects: index.projects.map((p) => (p.id === id ? nextProject : p)),
            };

            await this.writeProjectIndex(next);
            return { project: nextProject } satisfies ProjectUpdateResponse;
        });

        this.registry.handleInvoke('project:delete', async (_evt, payload) => {
            const req = payload as ProjectDeleteRequest;
            const id = requireProjectId(req?.id, 'id');

            const index = await this.readProjectIndex();
            const existing = index.projects.find((p) => p.id === id);
            if (!existing) {
                throw createIpcError('NOT_FOUND', 'Project not found', { id });
            }

            const remaining = index.projects.filter((p) => p.id !== id);
            if (remaining.length === 0) {
                throw createIpcError('CONFLICT', 'Cannot delete the last project');
            }

            const requestedReassign = coerceString(req?.reassignProjectId);
            const fallback =
                requestedReassign && remaining.some((p) => p.id === requestedReassign) ? requestedReassign : remaining[0].id;

            const nextCurrent = index.currentProjectId === id ? fallback : index.currentProjectId;
            const next: ProjectIndexFileV1 = {
                version: 1,
                currentProjectId: nextCurrent,
                projects: remaining,
            };

            await this.writeProjectIndex(next);

            // Best-effort cleanup; failure should be observable and retryable.
            try {
                await fs.rm(this.getProjectRoot(id), { recursive: true, force: true });
            } catch (error) {
                throw createIpcError('IO_ERROR', 'Failed to delete project directory', { id, message: error instanceof Error ? error.message : String(error) });
            }

            return { deleted: true, currentProjectId: nextCurrent || fallback } satisfies ProjectDeleteResponse;
        });
    }

    private async listDocumentFiles(): Promise<DocumentFileListItem[]> {
        const dir = this.getDocumentsDir();
        await ensureDir(dir);

        const entries = await fs.readdir(dir, { withFileTypes: true });
        const mdFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'));

        const items = await Promise.all(
            mdFiles.map(async (entry) => {
                const fullPath = path.join(dir, entry.name);
                const stat = await fs.stat(fullPath);
                const content = await fs.readFile(fullPath, 'utf8').catch(() => '');
                const createdAt = stat.birthtimeMs || stat.ctimeMs || stat.mtimeMs || Date.now();
                return {
                    name: entry.name,
                    path: entry.name,
                    createdAt,
                    wordCount: countWords(content),
                } satisfies DocumentFileListItem;
            }),
        );

        items.sort((a, b) => b.createdAt - a.createdAt);
        return items;
    }

    private registerFileHandlers(): void {
        this.registry.handleInvoke('file:session:status', async () => {
            return { uncleanExitDetected: false } satisfies FileSessionStatusResponse;
        });

        this.registry.handleInvoke('file:list', async (_evt, payload) => {
            const req = payload as FileListRequest;
            const scope = req?.scope;
            if (typeof scope !== 'undefined' && scope !== 'documents') {
                throw createIpcError('INVALID_ARGUMENT', 'Invalid scope', { scope });
            }

            const projectId = coerceString(req?.projectId);
            if (projectId) {
                throw createIpcError('DB_ERROR', 'Database is not ready');
            }

            const items = await this.listDocumentFiles();
            return { items } satisfies FileListResponse;
        });

        this.registry.handleInvoke('file:read', async (_evt, payload) => {
            const req = payload as FileReadRequest;
            const docName = resolveDocumentFileName(req?.path);

            const fullPath = path.join(this.getDocumentsDir(), docName);

            const content = await fs.readFile(fullPath, 'utf8').catch((error: unknown) => {
                const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
                if (code === 'ENOENT') {
                    throw createIpcError('NOT_FOUND', 'Not found', { path: docName });
                }
                throw error;
            });

            return { content, encoding: 'utf8' } satisfies FileReadResponse;
        });

        this.registry.handleInvoke('file:write', async (_evt, payload) => {
            const req = payload as FileWriteRequest;
            const docName = resolveDocumentFileName(req?.path);

            const content = typeof req?.content === 'string' ? req.content : null;
            if (content === null) {
                throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof req?.content });
            }

            const dir = this.getDocumentsDir();
            await ensureDir(dir);

            const fullPath = path.join(dir, docName);
            if (!(await pathExists(fullPath))) {
                throw createIpcError('NOT_FOUND', 'Not found', { path: docName });
            }

            await fs.writeFile(fullPath, content, 'utf8');
            return { written: true } satisfies FileWriteResponse;
        });

        this.registry.handleInvoke('file:create', async (_evt, payload) => {
            const req = payload as FileCreateRequest;
            const template = req?.template;
            if (typeof template !== 'undefined' && template !== 'default' && template !== 'blank') {
                throw createIpcError('INVALID_ARGUMENT', 'Invalid template', { template });
            }

            const dir = this.getDocumentsDir();
            await ensureDir(dir);

            const safeName = sanitizeFileName(req?.name);
            const fileName = await findAvailableFileName(dir, safeName);
            const fullPath = path.join(dir, fileName);
            const defaultContent = getDefaultMarkdownContent(fileName, template);

            await fs.writeFile(fullPath, defaultContent, { encoding: 'utf8', flag: 'wx' });

            return { name: fileName, path: fileName } satisfies FileCreateResponse;
        });

        this.registry.handleInvoke('file:delete', async (_evt, payload) => {
            const req = payload as FileDeleteRequest;
            const docName = resolveDocumentFileName(req?.path);

            const dir = this.getDocumentsDir();
            const fullPath = path.join(dir, docName);

            try {
                await fs.unlink(fullPath);
            } catch (error: unknown) {
                const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
                if (code === 'ENOENT') {
                    throw createIpcError('NOT_FOUND', 'Not found', { path: docName });
                }
                throw error;
            }

            return { deleted: true } satisfies FileDeleteResponse;
        });

        this.registry.handleInvoke('file:snapshot:write', async (_evt, payload) => {
            const req = payload as FileSnapshotWriteRequest;
            const docName = resolveDocumentFileName(req?.path);

            const content = typeof req?.content === 'string' ? req.content : null;
            if (content === null) {
                throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof req?.content });
            }

            const reason: SnapshotReason = req?.reason === 'manual' ? 'manual' : 'auto';

            const snapshotsDir = this.getSnapshotsDir();
            await ensureDir(snapshotsDir);

            const createdAt = Date.now();
            const snapshotFileName = buildSnapshotFileName(docName, createdAt);

            const snapshotPayload = {
                version: 1,
                path: docName,
                createdAt,
                reason,
                content,
            };

            await fs.writeFile(path.join(snapshotsDir, snapshotFileName), JSON.stringify(snapshotPayload), 'utf8');

            const maxKeep = 50;

            const prefix = `${sanitizeSnapshotPrefix(docName)}__`;
            await this.pruneSnapshotsByPrefix(snapshotsDir, prefix, maxKeep);

            return { snapshotId: snapshotFileName } satisfies FileSnapshotWriteResponse;
        });

        this.registry.handleInvoke('file:snapshot:latest', async (_evt, payload) => {
            const req = payload as FileSnapshotLatestRequest;

            const snapshotsDir = this.getSnapshotsDir();
            await ensureDir(snapshotsDir);

            const prefix = typeof req?.path === 'string' && req.path.trim() ? `${sanitizeSnapshotPrefix(req.path)}__` : null;

            const entries = await fs.readdir(snapshotsDir, { withFileTypes: true });
            const candidateNames = entries
                .filter((e) => e.isFile() && isSnapshotFile(e.name))
                .map((e) => e.name)
                .filter((name) => (prefix ? name.startsWith(prefix) : true));

            if (candidateNames.length === 0) {
                return { snapshot: null } satisfies FileSnapshotLatestResponse;
            }

            const items = await Promise.all(
                candidateNames.map(async (name) => {
                    const stat = await fs.stat(path.join(snapshotsDir, name));
                    return { name, mtimeMs: stat.mtimeMs };
                }),
            );

            items.sort((a, b) => b.mtimeMs - a.mtimeMs);
            const latest = items[0];

            try {
                const raw = await fs.readFile(path.join(snapshotsDir, latest.name), 'utf8');
                const parsed = JSON.parse(raw) as unknown;
                const snapshot = buildSnapshotModel(latest.name, parsed);
                return { snapshot } satisfies FileSnapshotLatestResponse;
            } catch {
                return { snapshot: null } satisfies FileSnapshotLatestResponse;
            }
        });
    }

    private async pruneSnapshotsByPrefix(dir: string, prefix: string, maxKeep: number): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const names = entries
            .filter((e) => e.isFile() && isSnapshotFile(e.name) && e.name.startsWith(prefix))
            .map((e) => e.name);

        const items = await Promise.all(
            names.map(async (name) => {
                const stat = await fs.stat(path.join(dir, name));
                return { name, mtimeMs: stat.mtimeMs };
            }),
        );

        items.sort((a, b) => b.mtimeMs - a.mtimeMs);
        const toDelete = items.slice(Math.max(0, maxKeep));

        await Promise.all(
            toDelete.map(async (item) => {
                try {
                    await fs.unlink(path.join(dir, item.name));
                } catch {
                    // Why: snapshot pruning failure should not break saving; it is safe to ignore.
                }
            }),
        );
    }
}
