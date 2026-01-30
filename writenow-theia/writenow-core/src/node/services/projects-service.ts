import { randomUUID } from 'node:crypto';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    IpcErrorCode,
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
} from '../../common/ipc-generated';
import type { ProjectsServiceContract as ProjectsServiceContractShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { type SqliteDatabase } from '../database/init';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

function toIsoNow(): string {
    return new Date().toISOString();
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function deserializeSettingValue(raw: unknown): unknown {
    if (typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return raw;
    }
}

function getSetting(db: SqliteDatabase, key: string): unknown {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: unknown } | undefined;
    return row ? deserializeSettingValue(row.value) : null;
}

function setSetting(db: SqliteDatabase, key: string, value: unknown): void {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
        key,
        JSON.stringify(value),
    );
}

/**
 * Safely parses a JSON array string.
 */
function parseJsonArray(raw: unknown): string[] {
    if (typeof raw !== 'string') return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

function mapProjectRow(row: unknown): Project {
    const record = row as {
        id?: unknown;
        name?: unknown;
        description?: unknown;
        style_guide?: unknown;
        status?: unknown;
        cover_image?: unknown;
        tags?: unknown;
        word_count?: unknown;
        featured?: unknown;
        collection_id?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
    };

    const id = coerceString(record.id);
    const name = coerceString(record.name);
    const description = coerceString(record.description) || undefined;
    const styleGuide = coerceString(record.style_guide) || undefined;
    const createdAt = coerceString(record.created_at);
    const updatedAt = coerceString(record.updated_at);

    // Extended fields (P9-01)
    const statusRaw = coerceString(record.status);
    const status = statusRaw === 'published' || statusRaw === 'archived' ? statusRaw : 'draft';
    const coverImage = coerceString(record.cover_image) || undefined;
    const tags = parseJsonArray(record.tags);
    const wordCount = typeof record.word_count === 'number' ? record.word_count : 0;
    const featured = record.featured === 1;
    const collectionId = coerceString(record.collection_id) || undefined;

    return {
        id,
        name,
        description,
        styleGuide,
        status,
        coverImage,
        tags,
        wordCount,
        featured,
        collectionId,
        createdAt,
        updatedAt,
    };
}

function listProjects(db: SqliteDatabase): Project[] {
    const rows = db
        .prepare(
            `SELECT id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at 
             FROM projects 
             ORDER BY updated_at DESC`,
        )
        .all();
    return rows.map(mapProjectRow).filter((project) => project.id && project.name);
}

function resolveCurrentProjectId(db: SqliteDatabase, projects: Project[]): string | null {
    const stored = getSetting(db, 'current_project_id');
    const storedId = coerceString(stored);
    if (storedId && projects.some((project) => project.id === storedId)) return storedId;

    const fallback = projects.length > 0 ? projects[0].id : null;
    if (fallback) setSetting(db, 'current_project_id', fallback);
    return fallback;
}

function ensureDefaultProject(db: SqliteDatabase): { created: boolean; projects: Project[] } {
    const existing = listProjects(db);
    if (existing.length > 0) return { created: false, projects: existing };

    const id = randomUUID();
    const now = toIsoNow();
    db.prepare(
        `INSERT INTO projects (id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, '默认项目', null, null, 'draft', null, '[]', 0, 0, null, now, now);
    setSetting(db, 'current_project_id', id);
    return { created: true, projects: listProjects(db) };
}

function bootstrapProjects(db: SqliteDatabase): ProjectBootstrapResponse {
    const ensured = ensureDefaultProject(db);
    const projects = ensured.projects;
    const currentProjectId = resolveCurrentProjectId(db, projects);
    if (!currentProjectId) throw createIpcError('DB_ERROR', 'Failed to resolve current project');

    const migrated = db.prepare("UPDATE articles SET project_id = ? WHERE project_id IS NULL AND id LIKE '%.md'").run(currentProjectId) as {
        changes?: unknown;
    };

    return {
        createdDefault: ensured.created,
        currentProjectId,
        migratedArticles: typeof migrated.changes === 'number' ? migrated.changes : Number(migrated.changes ?? 0),
    };
}

@injectable()
export class ProjectsService implements ProjectsServiceContractShape {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    async bootstrap(): Promise<ProjectBootstrapResponse> {
        const db = this.sqliteDb.db;
        try {
            return bootstrapProjects(db);
        } catch (error) {
            if (error && typeof error === 'object' && 'ipcError' in error) throw error;
            this.logger.error(`[projects] bootstrap failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to bootstrap projects', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    async list(): Promise<ProjectListResponse> {
        const db = this.sqliteDb.db;
        return { projects: listProjects(db) };
    }

    async getCurrent(): Promise<ProjectGetCurrentResponse> {
        const db = this.sqliteDb.db;
        const projects = listProjects(db);
        const currentProjectId = resolveCurrentProjectId(db, projects);
        return { projectId: currentProjectId };
    }

    async setCurrent(request: ProjectSetCurrentRequest): Promise<ProjectSetCurrentResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId);
        if (!exists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId });

        setSetting(db, 'current_project_id', projectId);
        return { projectId };
    }

    async create(request: ProjectCreateRequest): Promise<ProjectCreateResponse> {
        const db = this.sqliteDb.db;

        const name = coerceString(request?.name);
        const description = coerceString(request?.description) || null;
        const styleGuide = coerceString(request?.styleGuide) || null;

        if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required');
        if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });

        // Extended fields (P9-01)
        const statusRaw = coerceString((request as { status?: unknown }).status);
        const status = statusRaw === 'published' || statusRaw === 'archived' ? statusRaw : 'draft';
        const coverImage = coerceString((request as { coverImage?: unknown }).coverImage) || null;
        const tagsRaw = (request as { tags?: unknown }).tags;
        const tags = Array.isArray(tagsRaw) ? tagsRaw.filter((t) => typeof t === 'string').slice(0, 20) : [];
        const featured = (request as { featured?: unknown }).featured === true ? 1 : 0;
        const collectionId = coerceString((request as { collectionId?: unknown }).collectionId) || null;

        const id = randomUUID();
        const now = toIsoNow();
        db.prepare(
            `INSERT INTO projects (id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(id, name, description, styleGuide, status, coverImage, JSON.stringify(tags), 0, featured, collectionId, now, now);

        setSetting(db, 'current_project_id', id);

        const row = db
            .prepare(
                `SELECT id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at 
                 FROM projects WHERE id = ?`,
            )
            .get(id);
        return { project: mapProjectRow(row), currentProjectId: id };
    }

    async update(request: ProjectUpdateRequest): Promise<ProjectUpdateResponse> {
        const db = this.sqliteDb.db;

        const id = coerceString(request?.id);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        const name = typeof request?.name === 'string' ? request.name.trim() : undefined;
        const description = typeof request?.description === 'string' ? request.description.trim() : undefined;
        const styleGuide = typeof request?.styleGuide === 'string' ? request.styleGuide.trim() : undefined;

        if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty');
        if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });

        // Extended fields (P9-01)
        const reqExt = request as {
            status?: unknown;
            coverImage?: unknown;
            tags?: unknown;
            wordCount?: unknown;
            featured?: unknown;
            collectionId?: unknown;
        };
        const statusRaw = typeof reqExt.status === 'string' ? reqExt.status : undefined;
        const status = statusRaw === 'published' || statusRaw === 'archived' || statusRaw === 'draft' ? statusRaw : undefined;
        const coverImage = typeof reqExt.coverImage === 'string' ? reqExt.coverImage.trim() : undefined;
        const tags = Array.isArray(reqExt.tags) ? reqExt.tags.filter((t) => typeof t === 'string').slice(0, 20) : undefined;
        const wordCount =
            typeof reqExt.wordCount === 'number' && Number.isFinite(reqExt.wordCount) ? Math.max(0, Math.floor(reqExt.wordCount)) : undefined;
        const featured = typeof reqExt.featured === 'boolean' ? reqExt.featured : undefined;
        const collectionId = Object.prototype.hasOwnProperty.call(reqExt, 'collectionId')
            ? reqExt.collectionId === null
                ? null
                : coerceString(reqExt.collectionId) || null
            : undefined;

        const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
        if (!existing) throw createIpcError('NOT_FOUND', 'Project not found', { id });

        const sets: string[] = [];
        const params: Record<string, unknown> = { id };

        if (typeof name === 'string') {
            sets.push('name = @name');
            params.name = name;
        }
        if (typeof description === 'string') {
            sets.push('description = @description');
            params.description = description || null;
        }
        if (typeof styleGuide === 'string') {
            sets.push('style_guide = @style_guide');
            params.style_guide = styleGuide || null;
        }
        // Extended fields
        if (typeof status === 'string') {
            sets.push('status = @status');
            params.status = status;
        }
        if (typeof coverImage === 'string') {
            sets.push('cover_image = @cover_image');
            params.cover_image = coverImage || null;
        }
        if (Array.isArray(tags)) {
            sets.push('tags = @tags');
            params.tags = JSON.stringify(tags);
        }
        if (typeof wordCount === 'number') {
            sets.push('word_count = @word_count');
            params.word_count = wordCount;
        }
        if (typeof featured === 'boolean') {
            sets.push('featured = @featured');
            params.featured = featured ? 1 : 0;
        }
        if (collectionId !== undefined) {
            sets.push('collection_id = @collection_id');
            params.collection_id = collectionId;
        }

        if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update');

        params.updated_at = toIsoNow();
        sets.push('updated_at = @updated_at');

        db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params);

        const row = db
            .prepare(
                `SELECT id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at 
                 FROM projects WHERE id = ?`,
            )
            .get(id);
        return { project: mapProjectRow(row) };
    }

    async delete(request: ProjectDeleteRequest): Promise<ProjectDeleteResponse> {
        const db = this.sqliteDb.db;

        const id = coerceString(request?.id);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
        if (!existing) throw createIpcError('NOT_FOUND', 'Project not found', { id });

        const projects = listProjects(db).filter((project) => project.id !== id);
        if (projects.length === 0) {
            throw createIpcError('CONFLICT', 'Cannot delete the last project');
        }

        const requestedReassign = coerceString(request?.reassignProjectId);
        const fallbackProjectId =
            requestedReassign && projects.some((project) => project.id === requestedReassign) ? requestedReassign : projects[0].id;

        const tx = db.transaction(() => {
            db.prepare('DELETE FROM characters WHERE project_id = ?').run(id);
            db.prepare('DELETE FROM outlines WHERE project_id = ?').run(id);
            db.prepare('DELETE FROM kg_relations WHERE project_id = ?').run(id);
            db.prepare('DELETE FROM kg_entities WHERE project_id = ?').run(id);
            db.prepare('DELETE FROM writing_constraints WHERE project_id = ?').run(id);
            db.prepare('DELETE FROM terminology WHERE project_id = ?').run(id);
            db.prepare('DELETE FROM forbidden_words WHERE project_id = ?').run(id);
            db.prepare('UPDATE articles SET project_id = ? WHERE project_id = ?').run(fallbackProjectId, id);
            db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        });
        tx();

        const current = getSetting(db, 'current_project_id');
        if (coerceString(current) === id) {
            setSetting(db, 'current_project_id', fallbackProjectId);
        }

        return { deleted: true, currentProjectId: fallbackProjectId };
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('project:bootstrap', async () => {
            return this.bootstrap();
        });

        registry.handleInvoke('project:list', async () => {
            return this.list();
        });

        registry.handleInvoke('project:getCurrent', async () => {
            return this.getCurrent();
        });

        registry.handleInvoke('project:setCurrent', async (_evt, payload) => {
            return this.setCurrent(payload as ProjectSetCurrentRequest);
        });

        registry.handleInvoke('project:create', async (_evt, payload) => {
            return this.create(payload as ProjectCreateRequest);
        });

        registry.handleInvoke('project:update', async (_evt, payload) => {
            return this.update(payload as ProjectUpdateRequest);
        });

        registry.handleInvoke('project:delete', async (_evt, payload) => {
            return this.delete(payload as ProjectDeleteRequest);
        });
    }
}
