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

function mapProjectRow(row: unknown): Project {
    const record = row as {
        id?: unknown;
        name?: unknown;
        description?: unknown;
        style_guide?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
    };

    const id = coerceString(record.id);
    const name = coerceString(record.name);
    const description = coerceString(record.description) || undefined;
    const styleGuide = coerceString(record.style_guide) || undefined;
    const createdAt = coerceString(record.created_at);
    const updatedAt = coerceString(record.updated_at);

    return {
        id,
        name,
        description,
        styleGuide,
        createdAt,
        updatedAt,
    };
}

function listProjects(db: SqliteDatabase): Project[] {
    const rows = db
        .prepare('SELECT id, name, description, style_guide, created_at, updated_at FROM projects ORDER BY updated_at DESC')
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
    db.prepare('INSERT INTO projects (id, name, description, style_guide, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        '默认项目',
        null,
        null,
        now,
        now,
    );
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

        const id = randomUUID();
        const now = toIsoNow();
        db.prepare('INSERT INTO projects (id, name, description, style_guide, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
            id,
            name,
            description,
            styleGuide,
            now,
            now,
        );

        setSetting(db, 'current_project_id', id);

        const row = db.prepare('SELECT id, name, description, style_guide, created_at, updated_at FROM projects WHERE id = ?').get(id);
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

        if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update');

        params.updated_at = toIsoNow();
        sets.push('updated_at = @updated_at');

        db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params);

        const row = db.prepare('SELECT id, name, description, style_guide, created_at, updated_at FROM projects WHERE id = ?').get(id);
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
