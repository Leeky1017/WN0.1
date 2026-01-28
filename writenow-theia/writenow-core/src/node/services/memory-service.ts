import { createHash, randomUUID } from 'node:crypto';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    IpcErrorCode,
    JsonValue,
    MemoryCreateRequest,
    MemoryCreateResponse,
    MemoryDeleteRequest,
    MemoryDeleteResponse,
    MemoryInjectionPreviewRequest,
    MemoryInjectionPreviewResponse,
    MemoryListRequest,
    MemoryListResponse,
    MemoryPreferencesClearRequest,
    MemoryPreferencesClearResponse,
    MemoryPreferencesIngestRequest,
    MemoryPreferencesIngestResponse,
    MemorySettings,
    MemorySettingsGetResponse,
    MemorySettingsUpdateRequest,
    MemorySettingsUpdateResponse,
    MemoryUpdateRequest,
    MemoryUpdateResponse,
    UserMemory,
    UserMemoryEvidence,
    UserMemoryType,
} from '../../common/ipc-generated';
import { EmbeddingService as EmbeddingServiceToken } from '../../common/writenow-protocol';
import type { EmbeddingService as EmbeddingServiceShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { type SqliteDatabase } from '../database/init';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { VectorStore } from '../rag/vector-store';

const DEFAULT_SETTINGS: Readonly<MemorySettings> = Object.freeze({
    injectionEnabled: true,
    preferenceLearningEnabled: true,
    privacyModeEnabled: false,
    preferenceLearningThreshold: 3,
});

const SETTINGS_KEYS = Object.freeze({
    injectionEnabled: 'memory.injectionEnabled',
    preferenceLearningEnabled: 'preferenceLearning.enabled',
    privacyModeEnabled: 'privacyMode.enabled',
    preferenceLearningThreshold: 'preferenceLearning.threshold',
    preferenceLearningCounts: 'preferenceLearning.counts.v1',
});

type PreferenceCounts = {
    version: 1;
    accepted: Record<string, number>;
    rejected: Record<string, number>;
    updatedAt: string;
};

type IpcErrorLike = Readonly<{
    ipcError: Readonly<{ code: IpcErrorCode; message: string; details?: unknown }>;
}>;

function isIpcErrorLike(value: unknown): value is IpcErrorLike {
    if (!value || typeof value !== 'object') return false;
    if (!('ipcError' in value)) return false;
    const ipcError = (value as { ipcError?: unknown }).ipcError;
    if (!ipcError || typeof ipcError !== 'object') return false;
    const record = ipcError as { code?: unknown; message?: unknown };
    return typeof record.code === 'string' && typeof record.message === 'string';
}

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = { code, message, ...(typeof details === 'undefined' ? {} : { details }) };
    return error;
}

function toIsoNow(): string {
    return new Date().toISOString();
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function clampQueryText(value: unknown): string {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '';
    if (text.length <= 4000) return text;
    return `${text.slice(0, 3999)}…`;
}

function getStoredEmbeddingDimension(db: SqliteDatabase): number | null {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'embedding.dimension'").get() as { value?: unknown } | undefined;
    const raw = typeof row?.value === 'string' ? row.value : '';
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    } catch {
        // ignore
    }
    const fallback = Number.parseInt(raw, 10);
    if (!Number.isFinite(fallback) || fallback <= 0) return null;
    return Math.floor(fallback);
}

function toBooleanOrUndefined(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeMemoryType(value: unknown): UserMemoryType | '' {
    const raw = coerceString(value);
    if (raw === 'preference' || raw === 'feedback' || raw === 'style') return raw;
    return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function normalizeSettings(raw: unknown): MemorySettings {
    const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    return {
        injectionEnabled: typeof obj?.injectionEnabled === 'boolean' ? obj.injectionEnabled : DEFAULT_SETTINGS.injectionEnabled,
        preferenceLearningEnabled:
            typeof obj?.preferenceLearningEnabled === 'boolean' ? obj.preferenceLearningEnabled : DEFAULT_SETTINGS.preferenceLearningEnabled,
        privacyModeEnabled: typeof obj?.privacyModeEnabled === 'boolean' ? obj.privacyModeEnabled : DEFAULT_SETTINGS.privacyModeEnabled,
        preferenceLearningThreshold:
            typeof obj?.preferenceLearningThreshold === 'number' &&
            Number.isFinite(obj.preferenceLearningThreshold) &&
            obj.preferenceLearningThreshold > 0
                ? Math.min(20, Math.floor(obj.preferenceLearningThreshold))
                : DEFAULT_SETTINGS.preferenceLearningThreshold,
    };
}

function readSettings(db: SqliteDatabase): MemorySettings {
    return normalizeSettings({
        injectionEnabled: getSetting(db, SETTINGS_KEYS.injectionEnabled),
        preferenceLearningEnabled: getSetting(db, SETTINGS_KEYS.preferenceLearningEnabled),
        privacyModeEnabled: getSetting(db, SETTINGS_KEYS.privacyModeEnabled),
        preferenceLearningThreshold: getSetting(db, SETTINGS_KEYS.preferenceLearningThreshold),
    });
}

function writeSettings(db: SqliteDatabase, patch: MemorySettingsUpdateRequest): MemorySettings {
    const current = readSettings(db);

    const injectionEnabled = toBooleanOrUndefined(patch?.injectionEnabled);
    const preferenceLearningEnabled = toBooleanOrUndefined(patch?.preferenceLearningEnabled);
    const privacyModeEnabled = toBooleanOrUndefined(patch?.privacyModeEnabled);
    const threshold = toNumberOrUndefined(patch?.preferenceLearningThreshold);

    const next = normalizeSettings({
        injectionEnabled: typeof injectionEnabled === 'boolean' ? injectionEnabled : current.injectionEnabled,
        preferenceLearningEnabled: typeof preferenceLearningEnabled === 'boolean' ? preferenceLearningEnabled : current.preferenceLearningEnabled,
        privacyModeEnabled: typeof privacyModeEnabled === 'boolean' ? privacyModeEnabled : current.privacyModeEnabled,
        preferenceLearningThreshold: typeof threshold === 'number' ? threshold : current.preferenceLearningThreshold,
    });

    setSetting(db, SETTINGS_KEYS.injectionEnabled, next.injectionEnabled);
    setSetting(db, SETTINGS_KEYS.preferenceLearningEnabled, next.preferenceLearningEnabled);
    setSetting(db, SETTINGS_KEYS.privacyModeEnabled, next.privacyModeEnabled);
    setSetting(db, SETTINGS_KEYS.preferenceLearningThreshold, next.preferenceLearningThreshold);

    return next;
}

function normalizeCounts(raw: unknown): PreferenceCounts {
    const obj = isRecord(raw) ? raw : null;
    const version = obj?.version === 1 ? 1 : 1;
    const acceptedRaw = isRecord(obj?.accepted) ? (obj?.accepted as Record<string, unknown>) : {};
    const rejectedRaw = isRecord(obj?.rejected) ? (obj?.rejected as Record<string, unknown>) : {};
    const accepted: Record<string, number> = {};
    const rejected: Record<string, number> = {};

    for (const [key, value] of Object.entries(acceptedRaw)) {
        const k = coerceString(key);
        const n = typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
        if (k && n > 0) accepted[k] = Math.min(9999, n);
    }
    for (const [key, value] of Object.entries(rejectedRaw)) {
        const k = coerceString(key);
        const n = typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
        if (k && n > 0) rejected[k] = Math.min(9999, n);
    }

    return { version, accepted, rejected, updatedAt: toIsoNow() };
}

function loadCounts(db: SqliteDatabase): PreferenceCounts {
    return normalizeCounts(getSetting(db, SETTINGS_KEYS.preferenceLearningCounts));
}

function saveCounts(db: SqliteDatabase, counts: PreferenceCounts): void {
    setSetting(db, SETTINGS_KEYS.preferenceLearningCounts, counts);
}

function normalizeSignal(raw: unknown): string {
    const text = coerceString(raw);
    if (!text) return '';
    if (text.length > 240) return `${text.slice(0, 239)}…`;
    return text.replace(/\s+/g, ' ');
}

function isNoiseSignal(signal: string): boolean {
    if (!signal) return true;
    if (signal.startsWith('skill:')) return true;
    return false;
}

function hashId(input: string): string {
    return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function formatLearnedPreference(kind: 'accepted' | 'rejected', signal: string): string {
    if (kind === 'accepted') return signal;
    const lowered = signal.toLowerCase();
    const hasNegation =
        lowered.includes('不要') || lowered.includes('避免') || lowered.includes('不喜欢') || lowered.includes('少用') || lowered.includes('禁止');
    return hasNegation ? signal : `避免：${signal}`;
}

function ensureProjectExists(db: SqliteDatabase, projectId: string): void {
    const pid = coerceString(projectId);
    if (!pid) return;
    const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(pid);
    if (!exists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId: pid });
}

function mapOrigin(id: string): 'manual' | 'learned' {
    return id.startsWith('learned:') ? 'learned' : 'manual';
}

const USER_MEMORY_SELECT_COLUMNS =
    'id, type, content, project_id, confidence, evidence_json, metadata_json, revision, deleted_at, created_at, updated_at';

function clampConfidence(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value ?? NaN);
    if (!Number.isFinite(numeric)) return 1;
    return Math.max(0, Math.min(1, numeric));
}

function parseJsonValue(raw: unknown, fallback: JsonValue): JsonValue {
    if (typeof raw !== 'string') return fallback;
    try {
        return JSON.parse(raw) as JsonValue;
    } catch {
        return fallback;
    }
}

function parseJsonObject(raw: unknown): JsonValue {
    const parsed = parseJsonValue(raw, {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
}

function parseEvidence(raw: unknown): UserMemoryEvidence[] {
    const parsed = parseJsonValue(raw, []) as JsonValue;
    if (!Array.isArray(parsed)) return [];
    return parsed
        .map((value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
            const record = value as { kind?: unknown; ref?: unknown; meta?: unknown };
            const kind = coerceString(record.kind);
            const ref = coerceString(record.ref);
            if (!kind || !ref) return null;
            if (kind !== 'run' && kind !== 'file' && kind !== 'paragraph' && kind !== 'feedback' && kind !== 'custom') return null;
            return {
                kind,
                ref,
                ...(typeof record.meta === 'undefined' ? {} : { meta: record.meta as JsonValue }),
            } satisfies UserMemoryEvidence;
        })
        .filter(Boolean) as UserMemoryEvidence[];
}

function mapMemoryRow(row: unknown): UserMemory {
    const record = row as {
        id?: unknown;
        type?: unknown;
        content?: unknown;
        project_id?: unknown;
        confidence?: unknown;
        evidence_json?: unknown;
        metadata_json?: unknown;
        revision?: unknown;
        deleted_at?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
    };
    const id = coerceString(record.id);
    const type = normalizeMemoryType(record.type);
    const content = typeof record.content === 'string' ? record.content : '';
    const projectIdRaw = record.project_id;
    const projectId = typeof projectIdRaw === 'string' ? projectIdRaw : null;
    const confidence = clampConfidence(record.confidence);
    const evidence = parseEvidence(record.evidence_json);
    const metadata = parseJsonObject(record.metadata_json);
    const revisionRaw = typeof record.revision === 'number' ? record.revision : Number(record.revision ?? NaN);
    const revision = Number.isFinite(revisionRaw) && revisionRaw > 0 ? Math.floor(revisionRaw) : 1;
    const deletedAtRaw = record.deleted_at;
    const deletedAt = typeof deletedAtRaw === 'string' && deletedAtRaw.trim() ? deletedAtRaw : null;
    const createdAt = coerceString(record.created_at);
    const updatedAt = coerceString(record.updated_at);
    return {
        id,
        type: type || 'preference',
        content,
        projectId,
        origin: mapOrigin(id),
        confidence,
        evidence,
        metadata,
        revision,
        deletedAt,
        createdAt,
        updatedAt,
    };
}

function clampText(text: string, maxChars: number): string {
    const value = typeof text === 'string' ? text.trim() : '';
    if (maxChars <= 0) return '';
    if (value.length <= maxChars) return value;
    return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

function getTypeOrder(type: UserMemoryType): number {
    if (type === 'preference') return 1;
    if (type === 'style') return 2;
    if (type === 'feedback') return 3;
    return 99;
}

function getScopeOrder(projectId: string | null): number {
    return projectId ? 1 : 2;
}

function getOriginOrder(id: string): number {
    return mapOrigin(id) === 'manual' ? 1 : 2;
}

/**
 * Selects `user_memory` items for AI injection.
 * Why: keep injection minimal + ordered + privacy-aware, and share the same selection logic between preview and AI runs.
 */
function selectMemoryForInjection(input: { db: SqliteDatabase; projectId: string; settings: MemorySettings; maxItems?: number; maxChars?: number; maxCharsPerItem?: number }): {
    settings: MemorySettings;
    items: UserMemory[];
    usedChars: number;
    limits: { maxItems: number; maxChars: number; maxCharsPerItem: number };
} {
    const database = input.db;
    const projectId = coerceString(input.projectId);
    const settings = input.settings;

    const maxItems = typeof input.maxItems === 'number' && Number.isFinite(input.maxItems) && input.maxItems > 0 ? Math.min(50, Math.floor(input.maxItems)) : 12;
    const maxChars = typeof input.maxChars === 'number' && Number.isFinite(input.maxChars) && input.maxChars > 0 ? Math.min(20_000, Math.floor(input.maxChars)) : 1800;
    const maxCharsPerItem =
        typeof input.maxCharsPerItem === 'number' && Number.isFinite(input.maxCharsPerItem) && input.maxCharsPerItem > 0
            ? Math.min(5000, Math.floor(input.maxCharsPerItem))
            : 360;

    if (!settings.injectionEnabled) {
        return { settings, items: [], usedChars: 0, limits: { maxItems, maxChars, maxCharsPerItem } };
    }

    const clauses: string[] = [];
    const params: Record<string, unknown> = {};

    if (projectId) {
        clauses.push('(project_id IS NULL OR project_id = @project_id)');
        params.project_id = projectId;
    } else {
        clauses.push('project_id IS NULL');
    }

    if (settings.privacyModeEnabled) {
        clauses.push("id NOT LIKE 'learned:%'");
    }

    clauses.push('deleted_at IS NULL');

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = database
        .prepare(`SELECT ${USER_MEMORY_SELECT_COLUMNS} FROM user_memory ${where} ORDER BY updated_at DESC LIMIT 500`)
        .all(params);

    const candidates = rows
        .map(mapMemoryRow)
        .filter((item) => item.id && item.type && typeof item.content === 'string' && item.content.trim());

    candidates.sort((a, b) => {
        const typeA = getTypeOrder(a.type);
        const typeB = getTypeOrder(b.type);
        if (typeA !== typeB) return typeA - typeB;

        const scopeA = getScopeOrder(a.projectId);
        const scopeB = getScopeOrder(b.projectId);
        if (scopeA !== scopeB) return scopeA - scopeB;

        const originA = getOriginOrder(a.id);
        const originB = getOriginOrder(b.id);
        if (originA !== originB) return originA - originB;

        if (a.updatedAt !== b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
        if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
        return a.id.localeCompare(b.id);
    });

    const kept: UserMemory[] = [];
    let usedChars = 0;
    for (const item of candidates) {
        if (kept.length >= maxItems) break;
        const nextContent = clampText(item.content, maxCharsPerItem);
        if (!nextContent) continue;

        const nextUsed = usedChars + nextContent.length;
        if (kept.length > 0 && nextUsed > maxChars) break;
        kept.push({ ...item, content: nextContent });
        usedChars = nextUsed;
    }

    return { settings, items: kept, usedChars, limits: { maxItems, maxChars, maxCharsPerItem } };
}

@injectable()
export class MemoryService {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
        @inject(EmbeddingServiceToken) private readonly embeddingService: EmbeddingServiceShape,
        @inject(VectorStore) private readonly vectorStore: VectorStore,
    ) {}

    private recallReasonFromError(error: unknown): 'VEC_UNAVAILABLE' | 'DIMENSION_CONFLICT' | 'ENCODING_FAILED' | 'UNKNOWN' {
        if (!isIpcErrorLike(error)) return 'UNKNOWN';
        if (error.ipcError.code === 'CONFLICT') return 'DIMENSION_CONFLICT';
        if (error.ipcError.code === 'DB_ERROR') return 'VEC_UNAVAILABLE';
        if (error.ipcError.code === 'ENCODING_FAILED' || error.ipcError.code === 'TIMEOUT') return 'ENCODING_FAILED';
        return 'UNKNOWN';
    }

    private async upsertUserMemoryEmbeddingsStrict(input: Readonly<{ items: Array<{ memoryId: string; text: string }>; expectedDimension?: number }>): Promise<number> {
        const items = Array.isArray(input.items) ? input.items : [];
        const cleaned = items
            .map((item) => ({
                memoryId: coerceString(item?.memoryId),
                text: clampText(coerceString(item?.text), 2000),
            }))
            .filter((item) => item.memoryId && item.text);
        if (cleaned.length === 0) return input.expectedDimension ?? 0;

        const batchSize = 32;
        let dimension = typeof input.expectedDimension === 'number' ? input.expectedDimension : null;

        for (let i = 0; i < cleaned.length; i += batchSize) {
            const batch = cleaned.slice(i, i + batchSize);
            const texts = batch.map((b) => b.text);

            const encoded = await this.embeddingService.encode(texts);
            if (dimension !== null && encoded.dimension !== dimension) {
                throw createIpcError('CONFLICT', 'Embedding dimension mismatch', {
                    expected: dimension,
                    received: encoded.dimension,
                    recovery: 'Rebuild vector index: delete vec tables and re-run embedding:index for all items.',
                });
            }
            dimension = encoded.dimension;

            this.vectorStore.ensureUserMemoryIndex(dimension);
            this.vectorStore.upsertUserMemoryEmbeddings(
                batch.map((b, idx) => ({
                    memoryId: b.memoryId,
                    embedding: encoded.vectors[idx],
                })),
            );
        }

        return dimension ?? 0;
    }

    private bestEffortDeleteUserMemoryEmbeddings(memoryIds: readonly string[]): void {
        const db = this.sqliteDb.db;
        const dimension = getStoredEmbeddingDimension(db);
        if (!dimension) return;
        try {
            this.vectorStore.ensureUserMemoryIndex(dimension);
            this.vectorStore.deleteUserMemoryEmbeddings(memoryIds);
        } catch (error) {
            this.logger.warn(
                `[memory] user_memory_vec delete skipped: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    private async recallSemanticMemory(input: Readonly<{
        db: SqliteDatabase;
        projectId: string;
        settings: MemorySettings;
        queryText: string;
        excludeIds: ReadonlySet<string>;
    }>): Promise<{ items: UserMemory[]; mode: 'deterministic' | 'semantic'; reason?: 'EMPTY_QUERY' | 'VEC_UNAVAILABLE' | 'DIMENSION_CONFLICT' | 'ENCODING_FAILED' | 'UNKNOWN' }> {
        const queryText = clampQueryText(input.queryText);
        if (!queryText) return { items: [], mode: 'deterministic', reason: 'EMPTY_QUERY' };

        let dimension = 0;
        let queryEmbedding: number[] = [];
        try {
            const encoded = await this.embeddingService.encode([queryText]);
            dimension = encoded.dimension;
            queryEmbedding = encoded.vectors[0] ?? [];
        } catch (error) {
            const reason = this.recallReasonFromError(error);
            this.logger.warn(
                `[memory] semantic recall fallback: mode=deterministic reason=${reason} projectId=${input.projectId || '(none)'} queryChars=${queryText.length}`,
            );
            return { items: [], mode: 'deterministic', reason };
        }

        try {
            this.vectorStore.ensureUserMemoryIndex(dimension);

            const clauses: string[] = [];
            const params: Record<string, unknown> = {};
            if (input.projectId) {
                clauses.push('(project_id IS NULL OR project_id = @project_id)');
                params.project_id = input.projectId;
            } else {
                clauses.push('project_id IS NULL');
            }
            if (input.settings.privacyModeEnabled) clauses.push("id NOT LIKE 'learned:%'");
            clauses.push('deleted_at IS NULL');
            const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

            const candidates = input.db
                .prepare(`SELECT id, content FROM user_memory ${where} ORDER BY updated_at DESC LIMIT 500`)
                .all(params) as Array<{ id?: unknown; content?: unknown }>;

            const idToText = new Map(
                candidates
                    .map((row) => ({ memoryId: coerceString(row?.id), text: typeof row?.content === 'string' ? row.content : '' }))
                    .filter((row) => row.memoryId && row.text.trim())
                    .map((row) => [row.memoryId, row.text] as const),
            );

            // Only index missing items to avoid repeated embedding work in preview.
            let existingIds = new Set<string>();
            try {
                const rows = input.db.prepare('SELECT memory_id FROM user_memory_vec').all() as Array<{ memory_id?: unknown }>;
                existingIds = new Set(rows.map((r) => coerceString(r.memory_id)).filter(Boolean));
            } catch {
                existingIds = new Set();
            }

            const toIndex = Array.from(idToText.entries())
                .filter(([memoryId]) => !existingIds.has(memoryId))
                .map(([memoryId, text]) => ({ memoryId, text }));
            if (toIndex.length > 0) {
                await this.upsertUserMemoryEmbeddingsStrict({ items: toIndex, expectedDimension: dimension });
            }

            const topK = 20;
            const hits = this.vectorStore.querySimilarUserMemory(queryEmbedding, { topK });
            if (hits.length === 0) {
                this.logger.info(
                    `[memory] semantic recall mode=semantic projectId=${input.projectId || '(none)'} dimension=${dimension} topK=${topK} recalled=0 queryChars=${queryText.length}`,
                );
                return { items: [], mode: 'semantic' };
            }

            const placeholders = hits.map(() => '?').join(',');
            const rows = input.db
                .prepare(`SELECT ${USER_MEMORY_SELECT_COLUMNS} FROM user_memory WHERE id IN (${placeholders}) AND deleted_at IS NULL`)
                .all(...hits.map((h) => h.memoryId)) as unknown[];

            const byId = new Map<string, UserMemory>();
            for (const row of rows) {
                const item = mapMemoryRow(row);
                if (item.id) byId.set(item.id, item);
            }

            const exclude = input.excludeIds;
            const scored = hits
                .map((hit) => {
                    const item = byId.get(hit.memoryId);
                    if (!item || !item.id) return null;
                    if (exclude.has(item.id)) return null;
                    if (input.projectId) {
                        if (item.projectId && item.projectId !== input.projectId) return null;
                    } else {
                        if (item.projectId) return null;
                    }
                    if (input.settings.privacyModeEnabled && item.origin === 'learned') return null;
                    if (!item.content || !item.content.trim()) return null;
                    return { item, distance: hit.distance };
                })
                .filter(Boolean) as Array<{ item: UserMemory; distance: number }>;

            scored.sort((a, b) => {
                if (a.distance !== b.distance) return a.distance - b.distance;
                const typeA = getTypeOrder(a.item.type);
                const typeB = getTypeOrder(b.item.type);
                if (typeA !== typeB) return typeA - typeB;
                const scopeA = getScopeOrder(a.item.projectId);
                const scopeB = getScopeOrder(b.item.projectId);
                if (scopeA !== scopeB) return scopeA - scopeB;
                const originA = getOriginOrder(a.item.id);
                const originB = getOriginOrder(b.item.id);
                if (originA !== originB) return originA - originB;
                if (a.item.updatedAt !== b.item.updatedAt) return b.item.updatedAt.localeCompare(a.item.updatedAt);
                if (a.item.createdAt !== b.item.createdAt) return b.item.createdAt.localeCompare(a.item.createdAt);
                return a.item.id.localeCompare(b.item.id);
            });

            const maxItems = 8;
            const maxChars = 1200;
            const maxCharsPerItem = 360;
            const kept: UserMemory[] = [];
            let usedChars = 0;
            for (const entry of scored) {
                if (kept.length >= maxItems) break;
                const nextContent = clampText(entry.item.content, maxCharsPerItem);
                if (!nextContent) continue;
                const nextUsed = usedChars + nextContent.length;
                if (kept.length > 0 && nextUsed > maxChars) break;
                kept.push({ ...entry.item, content: nextContent });
                usedChars = nextUsed;
            }

            this.logger.info(
                `[memory] semantic recall mode=semantic projectId=${input.projectId || '(none)'} dimension=${dimension} topK=${topK} recalled=${kept.length} queryChars=${queryText.length}`,
            );
            return { items: kept, mode: 'semantic' };
        } catch (error) {
            const reason = this.recallReasonFromError(error);
            this.logger.warn(
                `[memory] semantic recall fallback: mode=deterministic reason=${reason} projectId=${input.projectId || '(none)'} dimension=${dimension} message=${error instanceof Error ? error.message : String(error)}`,
            );
            return { items: [], mode: 'deterministic', reason };
        }
    }

    async list(request: MemoryListRequest): Promise<MemoryListResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        const includeGlobal = request?.includeGlobal !== false;
        const includeLearned = request?.includeLearned !== false;

        const scopeRaw = coerceString(request?.scope);
        const scope = scopeRaw === 'global' || scopeRaw === 'project' || scopeRaw === 'all' ? scopeRaw : 'all';
        const type = normalizeMemoryType(request?.type);
        const limitRaw = request?.limit;
        const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 200;

        const clauses: string[] = [];
        const params: Record<string, unknown> = {};

        if (scope === 'global') {
            clauses.push('project_id IS NULL');
        } else if (scope === 'project') {
            if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required for scope=project');
            ensureProjectExists(db, projectId);
            clauses.push('project_id = @project_id');
            params.project_id = projectId;
        } else if (projectId && includeGlobal) {
            ensureProjectExists(db, projectId);
            clauses.push('(project_id IS NULL OR project_id = @project_id)');
            params.project_id = projectId;
        } else if (projectId) {
            ensureProjectExists(db, projectId);
            clauses.push('project_id = @project_id');
            params.project_id = projectId;
        } else {
            clauses.push('project_id IS NULL');
        }

        if (type) {
            clauses.push('type = @type');
            params.type = type;
        }
        if (!includeLearned) {
            clauses.push("id NOT LIKE 'learned:%'");
        }

        clauses.push('deleted_at IS NULL');

        const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
        const rows = db
            .prepare(`SELECT ${USER_MEMORY_SELECT_COLUMNS} FROM user_memory ${where} ORDER BY updated_at DESC, created_at DESC LIMIT ${limit}`)
            .all(params);

        return { items: rows.map(mapMemoryRow).filter((item) => item.id && item.type && item.content) };
    }

    async getSettings(): Promise<MemorySettingsGetResponse> {
        const db = this.sqliteDb.db;
        return { settings: readSettings(db) };
    }

    async updateSettings(request: MemorySettingsUpdateRequest): Promise<MemorySettingsUpdateResponse> {
        const db = this.sqliteDb.db;
        const settings = writeSettings(db, request);
        return { settings };
    }

    async previewInjection(request: MemoryInjectionPreviewRequest): Promise<MemoryInjectionPreviewResponse> {
        const db = this.sqliteDb.db;
        const projectId = coerceString(request?.projectId);
        if (projectId) ensureProjectExists(db, projectId);

        const settings = readSettings(db);
        const selection = selectMemoryForInjection({ db, projectId, settings });
        const injectedMemory = selection.items;

        if (!selection.settings.injectionEnabled) {
            return { settings: selection.settings, injected: { memory: injectedMemory } };
        }

        const hasQueryText = Object.prototype.hasOwnProperty.call(request ?? {}, 'queryText');
        if (!hasQueryText) {
            return { settings: selection.settings, injected: { memory: injectedMemory } };
        }

        const queryText = clampQueryText(request?.queryText);
        const semantic = await this.recallSemanticMemory({
            db,
            projectId,
            settings: selection.settings,
            queryText,
            excludeIds: new Set(injectedMemory.map((m) => m.id).filter(Boolean)),
        });

        return {
            settings: selection.settings,
            injected: {
                memory: injectedMemory,
                ...(semantic.items.length > 0 ? { semanticMemory: semantic.items } : {}),
                recall: { mode: semantic.mode, ...(semantic.reason ? { reason: semantic.reason } : {}) },
            },
        };
    }

    async create(request: MemoryCreateRequest): Promise<MemoryCreateResponse> {
        const db = this.sqliteDb.db;
        const type = normalizeMemoryType(request?.type);
        if (!type) throw createIpcError('INVALID_ARGUMENT', 'type is required');

        const content = coerceString(request?.content);
        if (!content) throw createIpcError('INVALID_ARGUMENT', 'content is required');
        if (content.length > 10_000) throw createIpcError('INVALID_ARGUMENT', 'content is too long', { max: 10_000 });

        const projectIdRaw = request?.projectId;
        const projectId = projectIdRaw === null ? null : coerceString(projectIdRaw);
        if (projectId) ensureProjectExists(db, projectId);

        const id = randomUUID();
        const now = toIsoNow();
        db.prepare('INSERT INTO user_memory (id, type, content, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
            id,
            type,
            content,
            projectId || null,
            now,
            now,
        );

        const row = db.prepare(`SELECT ${USER_MEMORY_SELECT_COLUMNS} FROM user_memory WHERE id = ?`).get(id);
        const item = mapMemoryRow(row);
        void this.upsertUserMemoryEmbeddingsStrict({ items: [{ memoryId: id, text: content }] }).catch((error) => {
            const reason = this.recallReasonFromError(error);
            this.logger.warn(`[memory] user_memory_vec upsert skipped: reason=${reason} id=${id}`);
        });
        return { item };
    }

    async update(request: MemoryUpdateRequest): Promise<MemoryUpdateResponse> {
        const db = this.sqliteDb.db;
        const id = coerceString(request?.id);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        const existing = db.prepare('SELECT id, deleted_at FROM user_memory WHERE id = ?').get(id) as { id?: unknown; deleted_at?: unknown } | undefined;
        if (!existing) throw createIpcError('NOT_FOUND', 'Memory item not found', { id });
        if (typeof existing.deleted_at === 'string' && existing.deleted_at.trim()) {
            throw createIpcError('NOT_FOUND', 'Memory item not found', { id, deletedAt: existing.deleted_at });
        }

        const typeRaw = request?.type;
        const nextType = typeof typeRaw === 'undefined' ? undefined : normalizeMemoryType(typeRaw);
        if (typeof typeRaw !== 'undefined' && !nextType) throw createIpcError('INVALID_ARGUMENT', 'Invalid type', { type: typeRaw });

        const contentRaw = request?.content;
        const nextContent = typeof contentRaw === 'undefined' ? undefined : coerceString(contentRaw);
        if (typeof contentRaw !== 'undefined' && !nextContent) throw createIpcError('INVALID_ARGUMENT', 'content cannot be empty');
        if (typeof nextContent === 'string' && nextContent.length > 10_000) {
            throw createIpcError('INVALID_ARGUMENT', 'content is too long', { max: 10_000 });
        }

        let projectId: string | null | undefined = undefined;
        if (Object.prototype.hasOwnProperty.call(request ?? {}, 'projectId')) {
            const raw = request?.projectId;
            projectId = raw === null ? null : coerceString(raw);
            if (projectId) ensureProjectExists(db, projectId);
        }

        const sets: string[] = [];
        const params: Record<string, unknown> = { id };
        if (typeof nextType === 'string') {
            sets.push('type = @type');
            params.type = nextType;
        }
        if (typeof nextContent === 'string') {
            sets.push('content = @content');
            params.content = nextContent;
        }
        if (typeof projectId !== 'undefined') {
            sets.push('project_id = @project_id');
            params.project_id = projectId;
        }

        if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update');

        sets.push('revision = revision + 1');
        params.updated_at = toIsoNow();
        sets.push('updated_at = @updated_at');

        try {
            db.prepare(`UPDATE user_memory SET ${sets.join(', ')} WHERE id = @id AND deleted_at IS NULL`).run(params);
        } catch (error) {
            this.logger.error(`[memory] update failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to update memory item', { message: error instanceof Error ? error.message : String(error) });
        }

        const row = db.prepare(`SELECT ${USER_MEMORY_SELECT_COLUMNS} FROM user_memory WHERE id = ?`).get(id);
        const item = mapMemoryRow(row);
        if (typeof nextContent === 'string') {
            void this.upsertUserMemoryEmbeddingsStrict({ items: [{ memoryId: id, text: nextContent }] }).catch((error) => {
                const reason = this.recallReasonFromError(error);
                this.logger.warn(`[memory] user_memory_vec upsert skipped: reason=${reason} id=${id}`);
            });
        }
        return { item };
    }

    async delete(request: MemoryDeleteRequest): Promise<MemoryDeleteResponse> {
        const db = this.sqliteDb.db;
        const id = coerceString(request?.id);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        const existing = db.prepare('SELECT id, deleted_at FROM user_memory WHERE id = ?').get(id) as { id?: unknown; deleted_at?: unknown } | undefined;
        if (!existing) throw createIpcError('NOT_FOUND', 'Memory item not found', { id });
        if (typeof existing.deleted_at === 'string' && existing.deleted_at.trim()) {
            return { deleted: true };
        }

        const now = toIsoNow();
        try {
            db.prepare('UPDATE user_memory SET deleted_at = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND deleted_at IS NULL').run(
                now,
                now,
                id,
            );
        } catch (error) {
            this.logger.error(`[memory] delete failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to delete memory item', { message: error instanceof Error ? error.message : String(error) });
        }

        this.bestEffortDeleteUserMemoryEmbeddings([id]);
        return { deleted: true };
    }

    async ingestPreferences(request: MemoryPreferencesIngestRequest): Promise<MemoryPreferencesIngestResponse> {
        const db = this.sqliteDb.db;
        const settings = readSettings(db);
        if (!settings.preferenceLearningEnabled) {
            return { learned: [], ignored: 0, settings };
        }
        if (settings.privacyModeEnabled) {
            return { learned: [], ignored: 0, settings };
        }

        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        ensureProjectExists(db, projectId);

        const signals = (request as { signals?: unknown })?.signals as { accepted?: unknown; rejected?: unknown } | undefined;
        const acceptedRaw = Array.isArray(signals?.accepted) ? signals?.accepted : [];
        const rejectedRaw = Array.isArray(signals?.rejected) ? signals?.rejected : [];

        const acceptedSet = new Set(acceptedRaw.map(normalizeSignal).filter(Boolean));
        const rejectedSet = new Set(rejectedRaw.map(normalizeSignal).filter(Boolean));

        for (const s of acceptedSet) {
            if (rejectedSet.has(s)) {
                acceptedSet.delete(s);
                rejectedSet.delete(s);
            }
        }

        const accepted = Array.from(acceptedSet).filter((s) => !isNoiseSignal(s));
        const rejected = Array.from(rejectedSet).filter((s) => !isNoiseSignal(s));
        const ignored = acceptedRaw.length + rejectedRaw.length - accepted.length - rejected.length;

        if (accepted.length === 0 && rejected.length === 0) {
            return { learned: [], ignored, settings };
        }

        const counts = loadCounts(db);
        const threshold = settings.preferenceLearningThreshold;
        const learned: UserMemory[] = [];
        const now = toIsoNow();

        const maybeCreate = (kind: 'accepted' | 'rejected', signal: string) => {
            const content = formatLearnedPreference(kind, signal);
            const stable = hashId(`${kind}:${signal}`);
            const id = `learned:pref:${stable}`;

            const exists = db.prepare('SELECT 1 FROM user_memory WHERE id = ?').get(id);
            if (exists) return null;

            db.prepare('INSERT INTO user_memory (id, type, content, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
                id,
                'preference',
                content,
                null,
                now,
                now,
            );

            const row = db.prepare(`SELECT ${USER_MEMORY_SELECT_COLUMNS} FROM user_memory WHERE id = ?`).get(id);
            const item = mapMemoryRow(row);
            if (item.id) learned.push(item);
            void this.upsertUserMemoryEmbeddingsStrict({ items: [{ memoryId: id, text: content }] }).catch((error) => {
                const reason = this.recallReasonFromError(error);
                this.logger.warn(`[memory] user_memory_vec upsert skipped: reason=${reason} id=${id}`);
            });
            return item;
        };

        for (const signal of accepted) {
            const next = (counts.accepted[signal] ?? 0) + 1;
            counts.accepted[signal] = next;
            if (next === threshold) maybeCreate('accepted', signal);
        }

        for (const signal of rejected) {
            const next = (counts.rejected[signal] ?? 0) + 1;
            counts.rejected[signal] = next;
            if (next === threshold) maybeCreate('rejected', signal);
        }

        saveCounts(db, counts);
        this.logger.info(`[memory] preferences ingested learned=${learned.length} ignored=${ignored} threshold=${threshold}`);

        return { learned, ignored, settings };
    }

    async clearPreferences(request: MemoryPreferencesClearRequest): Promise<MemoryPreferencesClearResponse> {
        const db = this.sqliteDb.db;
        const scope = coerceString(request?.scope);
        if (scope && scope !== 'all' && scope !== 'learned') throw createIpcError('INVALID_ARGUMENT', 'Invalid scope', { scope });

        const effectiveScope = scope === 'all' ? 'all' : 'learned';
        const ids =
            effectiveScope === 'learned' || effectiveScope === 'all'
                ? (db
                      .prepare("SELECT id FROM user_memory WHERE id LIKE 'learned:%' AND deleted_at IS NULL")
                      .all() as Array<{ id?: unknown }>)
                      .map((row) => coerceString(row?.id))
                      .filter(Boolean)
                : [];

        const now = toIsoNow();
        const result = db
            .prepare("UPDATE user_memory SET deleted_at = ?, updated_at = ?, revision = revision + 1 WHERE id LIKE 'learned:%' AND deleted_at IS NULL")
            .run(now, now) as { changes?: unknown };
        saveCounts(db, normalizeCounts(null));
        if (ids.length > 0) this.bestEffortDeleteUserMemoryEmbeddings(ids);
        return { deletedCount: typeof result.changes === 'number' ? result.changes : Number(result.changes ?? 0) };
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('memory:list', async (_event, payload) => this.list(payload as MemoryListRequest));
        registry.handleInvoke('memory:settings:get', async () => this.getSettings());
        registry.handleInvoke('memory:settings:update', async (_event, payload) => this.updateSettings(payload as MemorySettingsUpdateRequest));
        registry.handleInvoke('memory:injection:preview', async (_event, payload) => this.previewInjection(payload as MemoryInjectionPreviewRequest));
        registry.handleInvoke('memory:create', async (_event, payload) => this.create(payload as MemoryCreateRequest));
        registry.handleInvoke('memory:update', async (_event, payload) => this.update(payload as MemoryUpdateRequest));
        registry.handleInvoke('memory:delete', async (_event, payload) => this.delete(payload as MemoryDeleteRequest));
        registry.handleInvoke('memory:preferences:ingest', async (_event, payload) => this.ingestPreferences(payload as MemoryPreferencesIngestRequest));
        registry.handleInvoke('memory:preferences:clear', async (_event, payload) => this.clearPreferences(payload as MemoryPreferencesClearRequest));
    }
}
