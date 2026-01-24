import { randomUUID } from 'node:crypto';

import { ILogger } from '@theia/core/lib/common/logger';
import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    IpcErrorCode,
    JsonValue,
    KgEntityCreateRequest,
    KgEntityCreateResponse,
    KgEntityDeleteRequest,
    KgEntityDeleteResponse,
    KgEntityListRequest,
    KgEntityListResponse,
    KgEntityUpdateRequest,
    KgEntityUpdateResponse,
    KgGraphGetRequest,
    KgGraphGetResponse,
    KgRelationCreateRequest,
    KgRelationCreateResponse,
    KgRelationDeleteRequest,
    KgRelationDeleteResponse,
    KgRelationListRequest,
    KgRelationListResponse,
    KgRelationUpdateRequest,
    KgRelationUpdateResponse,
    KnowledgeGraphEntity,
    KnowledgeGraphRelation,
} from '../../common/ipc-generated';
import type { KnowledgeGraphServiceContract as KnowledgeGraphServiceContractShape } from '../../common/writenow-protocol';
import { type SqliteDatabase } from '../database/init';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';

type EncodedJsonField = Readonly<{ present: boolean; value: string | null | undefined }>;

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

function hasOwn(obj: unknown, key: string): boolean {
    return Boolean(obj) && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}

function encodeJsonField(payload: unknown, key: string, options?: Readonly<{ maxBytes?: number }>): EncodedJsonField {
    if (!hasOwn(payload, key)) return { present: false, value: undefined };
    const raw = (payload as Record<string, unknown>)[key];
    if (typeof raw === 'undefined') return { present: false, value: undefined };
    if (raw === null) return { present: true, value: null };

    let json: string;
    try {
        json = JSON.stringify(raw);
    } catch {
        throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field: key });
    }

    const maxBytes = typeof options?.maxBytes === 'number' && options.maxBytes > 0 ? options.maxBytes : 256 * 1024;
    const bytes = Buffer.byteLength(json, 'utf8');
    if (bytes > maxBytes) {
        throw createIpcError('INVALID_ARGUMENT', 'JSON field too large', { field: key, bytes, maxBytes });
    }
    return { present: true, value: json };
}

function decodeJsonField(raw: unknown): JsonValue | undefined {
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
        return JSON.parse(trimmed) as JsonValue;
    } catch {
        return undefined;
    }
}

function mapEntityRow(row: unknown): KnowledgeGraphEntity {
    const record = row as {
        id?: unknown;
        project_id?: unknown;
        type?: unknown;
        name?: unknown;
        description?: unknown;
        metadata_json?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
    };

    const id = coerceString(record.id);
    const projectId = coerceString(record.project_id);
    const type = coerceString(record.type);
    const name = coerceString(record.name);
    const description = coerceString(record.description) || undefined;
    const createdAt = coerceString(record.created_at);
    const updatedAt = coerceString(record.updated_at);

    return {
        id,
        projectId,
        type,
        name,
        description,
        metadata: decodeJsonField(record.metadata_json),
        createdAt,
        updatedAt,
    };
}

function mapRelationRow(row: unknown): KnowledgeGraphRelation {
    const record = row as {
        id?: unknown;
        project_id?: unknown;
        from_entity_id?: unknown;
        to_entity_id?: unknown;
        type?: unknown;
        metadata_json?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
    };

    const id = coerceString(record.id);
    const projectId = coerceString(record.project_id);
    const fromEntityId = coerceString(record.from_entity_id);
    const toEntityId = coerceString(record.to_entity_id);
    const type = coerceString(record.type);
    const createdAt = coerceString(record.created_at);
    const updatedAt = coerceString(record.updated_at);

    return {
        id,
        projectId,
        fromEntityId,
        toEntityId,
        type,
        metadata: decodeJsonField(record.metadata_json),
        createdAt,
        updatedAt,
    };
}

function assertProjectExists(db: SqliteDatabase, projectId: string): void {
    const row = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId);
    if (!row) throw createIpcError('NOT_FOUND', 'Project not found', { projectId });
}

function assertEntityExists(db: SqliteDatabase, projectId: string, entityId: string): void {
    const row = db.prepare('SELECT id FROM kg_entities WHERE id = ? AND project_id = ?').get(entityId, projectId);
    if (!row) throw createIpcError('NOT_FOUND', 'Entity not found', { projectId, entityId });
}

function getRelationRow(db: SqliteDatabase, projectId: string, id: string): unknown | null {
    return (
        (db
            .prepare('SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE id = ? AND project_id = ?')
            .get(id, projectId) as unknown) ?? null
    );
}

function assertRelationExists(db: SqliteDatabase, projectId: string, id: string): void {
    const row = db.prepare('SELECT id FROM kg_relations WHERE id = ? AND project_id = ?').get(id, projectId);
    if (!row) throw createIpcError('NOT_FOUND', 'Relation not found', { projectId, id });
}

function listEntities(db: SqliteDatabase, projectId: string): KnowledgeGraphEntity[] {
    const rows = db
        .prepare(
            'SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE project_id = ? ORDER BY updated_at DESC',
        )
        .all(projectId);
    return rows.map(mapEntityRow).filter((e) => e.id && e.projectId && e.name && e.type);
}

function listRelations(db: SqliteDatabase, projectId: string, entityId?: string): KnowledgeGraphRelation[] {
    const entity = coerceString(entityId) || null;

    const rows = entity
        ? db
              .prepare(
                  `SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at
                   FROM kg_relations
                   WHERE project_id = ? AND (from_entity_id = ? OR to_entity_id = ?)
                   ORDER BY updated_at DESC`,
              )
              .all(projectId, entity, entity)
        : db
              .prepare(
                  'SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE project_id = ? ORDER BY updated_at DESC',
              )
              .all(projectId);

    return rows.map(mapRelationRow).filter((r) => r.id && r.projectId && r.fromEntityId && r.toEntityId && r.type);
}

function graphGet(db: SqliteDatabase, projectId: string): KgGraphGetResponse {
    const entities = db
        .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE project_id = ?')
        .all(projectId)
        .map(mapEntityRow)
        .filter((e) => e.id && e.projectId && e.name && e.type);

    const relations = db
        .prepare(
            'SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE project_id = ?',
        )
        .all(projectId)
        .map(mapRelationRow)
        .filter((r) => r.id && r.projectId && r.fromEntityId && r.toEntityId && r.type);

    return { entities, relations };
}

@injectable()
export class KnowledgeGraphService implements KnowledgeGraphServiceContractShape {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    async getGraph(request: KgGraphGetRequest): Promise<KgGraphGetResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        return graphGet(db, projectId);
    }

    async listEntities(request: KgEntityListRequest): Promise<KgEntityListResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        return { entities: listEntities(db, projectId) };
    }

    async createEntity(request: KgEntityCreateRequest): Promise<KgEntityCreateResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const type = coerceString(request?.type);
        const name = coerceString(request?.name);
        const description = coerceString(request?.description) || null;

        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!type) throw createIpcError('INVALID_ARGUMENT', 'type is required');
        if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required');
        if (type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 });
        if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });

        assertProjectExists(db, projectId);

        const metadata = encodeJsonField(request, 'metadata');
        const id = randomUUID();
        const now = toIsoNow();

        try {
            db.prepare(
                'INSERT INTO kg_entities (id, project_id, type, name, description, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ).run(id, projectId, type, name, description, metadata.present ? metadata.value : null, now, now);
        } catch (error) {
            this.logger.error(`[kg] entity create failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to create entity', { message: error instanceof Error ? error.message : String(error) });
        }

        const row = db
            .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE id = ?')
            .get(id);
        return { entity: mapEntityRow(row) };
    }

    async updateEntity(request: KgEntityUpdateRequest): Promise<KgEntityUpdateResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const id = coerceString(request?.id);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        assertEntityExists(db, projectId, id);

        const type = typeof request?.type === 'string' ? request.type.trim() : undefined;
        const name = typeof request?.name === 'string' ? request.name.trim() : undefined;
        const description = typeof request?.description === 'string' ? request.description.trim() : undefined;

        if (typeof type === 'string' && !type) throw createIpcError('INVALID_ARGUMENT', 'type cannot be empty');
        if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty');
        if (typeof type === 'string' && type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 });
        if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });

        const metadata = encodeJsonField(request, 'metadata');

        const sets: string[] = [];
        const params: Record<string, unknown> = { id, project_id: projectId };
        if (typeof type === 'string') {
            sets.push('type = @type');
            params.type = type;
        }
        if (typeof name === 'string') {
            sets.push('name = @name');
            params.name = name;
        }
        if (typeof description === 'string') {
            sets.push('description = @description');
            params.description = description || null;
        }
        if (metadata.present) {
            sets.push('metadata_json = @metadata_json');
            params.metadata_json = metadata.value;
        }
        if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update');

        params.updated_at = toIsoNow();
        sets.push('updated_at = @updated_at');

        try {
            db.prepare(`UPDATE kg_entities SET ${sets.join(', ')} WHERE id = @id AND project_id = @project_id`).run(params);
        } catch (error) {
            this.logger.error(`[kg] entity update failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to update entity', { message: error instanceof Error ? error.message : String(error) });
        }

        const row = db
            .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE id = ?')
            .get(id);
        return { entity: mapEntityRow(row) };
    }

    async deleteEntity(request: KgEntityDeleteRequest): Promise<KgEntityDeleteResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const id = coerceString(request?.id);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        assertEntityExists(db, projectId, id);

        try {
            db.prepare('DELETE FROM kg_entities WHERE id = ? AND project_id = ?').run(id, projectId);
        } catch (error) {
            this.logger.error(`[kg] entity delete failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to delete entity', { message: error instanceof Error ? error.message : String(error) });
        }

        return { deleted: true };
    }

    async listRelations(request: KgRelationListRequest): Promise<KgRelationListResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        return { relations: listRelations(db, projectId, request?.entityId) };
    }

    async createRelation(request: KgRelationCreateRequest): Promise<KgRelationCreateResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const fromEntityId = coerceString(request?.fromEntityId);
        const toEntityId = coerceString(request?.toEntityId);
        const type = coerceString(request?.type);

        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!fromEntityId) throw createIpcError('INVALID_ARGUMENT', 'fromEntityId is required');
        if (!toEntityId) throw createIpcError('INVALID_ARGUMENT', 'toEntityId is required');
        if (!type) throw createIpcError('INVALID_ARGUMENT', 'type is required');
        if (fromEntityId === toEntityId) throw createIpcError('INVALID_ARGUMENT', 'fromEntityId and toEntityId cannot be the same');
        if (type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 });

        assertProjectExists(db, projectId);
        assertEntityExists(db, projectId, fromEntityId);
        assertEntityExists(db, projectId, toEntityId);

        const metadata = encodeJsonField(request, 'metadata');
        const id = randomUUID();
        const now = toIsoNow();

        try {
            db.prepare(
                'INSERT INTO kg_relations (id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ).run(id, projectId, fromEntityId, toEntityId, type, metadata.present ? metadata.value : null, now, now);
        } catch (error) {
            this.logger.error(`[kg] relation create failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to create relation', { message: error instanceof Error ? error.message : String(error) });
        }

        const row = db
            .prepare('SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE id = ?')
            .get(id);
        return { relation: mapRelationRow(row) };
    }

    async updateRelation(request: KgRelationUpdateRequest): Promise<KgRelationUpdateResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const id = coerceString(request?.id);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        assertRelationExists(db, projectId, id);

        const existingRow = getRelationRow(db, projectId, id);
        if (!existingRow) throw createIpcError('NOT_FOUND', 'Relation not found', { projectId, id });
        const existing = mapRelationRow(existingRow);

        const fromEntityId = typeof request?.fromEntityId === 'string' ? request.fromEntityId.trim() : undefined;
        const toEntityId = typeof request?.toEntityId === 'string' ? request.toEntityId.trim() : undefined;
        const type = typeof request?.type === 'string' ? request.type.trim() : undefined;

        if (typeof fromEntityId === 'string' && !fromEntityId) throw createIpcError('INVALID_ARGUMENT', 'fromEntityId cannot be empty');
        if (typeof toEntityId === 'string' && !toEntityId) throw createIpcError('INVALID_ARGUMENT', 'toEntityId cannot be empty');
        if (typeof type === 'string' && !type) throw createIpcError('INVALID_ARGUMENT', 'type cannot be empty');
        if (typeof type === 'string' && type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 });

        const nextFrom = typeof fromEntityId === 'string' ? fromEntityId : existing.fromEntityId;
        const nextTo = typeof toEntityId === 'string' ? toEntityId : existing.toEntityId;
        if (nextFrom === nextTo) throw createIpcError('INVALID_ARGUMENT', 'fromEntityId and toEntityId cannot be the same');

        if (typeof fromEntityId === 'string' || typeof toEntityId === 'string') {
            assertEntityExists(db, projectId, nextFrom);
            assertEntityExists(db, projectId, nextTo);
        }

        const metadata = encodeJsonField(request, 'metadata');

        const sets: string[] = [];
        const params: Record<string, unknown> = { id, project_id: projectId };

        if (typeof fromEntityId === 'string') {
            sets.push('from_entity_id = @from_entity_id');
            params.from_entity_id = nextFrom;
        }
        if (typeof toEntityId === 'string') {
            sets.push('to_entity_id = @to_entity_id');
            params.to_entity_id = nextTo;
        }
        if (typeof type === 'string') {
            sets.push('type = @type');
            params.type = type;
        }
        if (metadata.present) {
            sets.push('metadata_json = @metadata_json');
            params.metadata_json = metadata.value;
        }
        if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update');

        params.updated_at = toIsoNow();
        sets.push('updated_at = @updated_at');

        try {
            db.prepare(`UPDATE kg_relations SET ${sets.join(', ')} WHERE id = @id AND project_id = @project_id`).run(params);
        } catch (error) {
            this.logger.error(`[kg] relation update failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to update relation', { message: error instanceof Error ? error.message : String(error) });
        }

        const row = db
            .prepare('SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE id = ?')
            .get(id);
        return { relation: mapRelationRow(row) };
    }

    async deleteRelation(request: KgRelationDeleteRequest): Promise<KgRelationDeleteResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const id = coerceString(request?.id);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        assertRelationExists(db, projectId, id);

        try {
            db.prepare('DELETE FROM kg_relations WHERE id = ? AND project_id = ?').run(id, projectId);
        } catch (error) {
            this.logger.error(`[kg] relation delete failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to delete relation', { message: error instanceof Error ? error.message : String(error) });
        }

        return { deleted: true };
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('kg:graph:get', async (_evt, payload) => {
            return this.getGraph(payload as KgGraphGetRequest);
        });

        registry.handleInvoke('kg:entity:list', async (_evt, payload) => {
            return this.listEntities(payload as KgEntityListRequest);
        });

        registry.handleInvoke('kg:entity:create', async (_evt, payload) => {
            return this.createEntity(payload as KgEntityCreateRequest);
        });

        registry.handleInvoke('kg:entity:update', async (_evt, payload) => {
            return this.updateEntity(payload as KgEntityUpdateRequest);
        });

        registry.handleInvoke('kg:entity:delete', async (_evt, payload) => {
            return this.deleteEntity(payload as KgEntityDeleteRequest);
        });

        registry.handleInvoke('kg:relation:list', async (_evt, payload) => {
            return this.listRelations(payload as KgRelationListRequest);
        });

        registry.handleInvoke('kg:relation:create', async (_evt, payload) => {
            return this.createRelation(payload as KgRelationCreateRequest);
        });

        registry.handleInvoke('kg:relation:update', async (_evt, payload) => {
            return this.updateRelation(payload as KgRelationUpdateRequest);
        });

        registry.handleInvoke('kg:relation:delete', async (_evt, payload) => {
            return this.deleteRelation(payload as KgRelationDeleteRequest);
        });
    }
}

