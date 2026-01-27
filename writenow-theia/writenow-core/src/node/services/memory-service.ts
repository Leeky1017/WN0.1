import { createHash, randomUUID } from 'node:crypto';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    IpcErrorCode,
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
    UserMemoryType,
} from '../../common/ipc-generated';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { type SqliteDatabase } from '../database/init';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

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

function mapMemoryRow(row: unknown): UserMemory {
    const record = row as {
        id?: unknown;
        type?: unknown;
        content?: unknown;
        project_id?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
    };
    const id = coerceString(record.id);
    const type = normalizeMemoryType(record.type);
    const content = typeof record.content === 'string' ? record.content : '';
    const projectIdRaw = record.project_id;
    const projectId = typeof projectIdRaw === 'string' ? projectIdRaw : null;
    const createdAt = coerceString(record.created_at);
    const updatedAt = coerceString(record.updated_at);
    return {
        id,
        type: type || 'preference',
        content,
        projectId,
        origin: mapOrigin(id),
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

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = database
        .prepare(`SELECT id, type, content, project_id, created_at, updated_at FROM user_memory ${where} ORDER BY updated_at DESC LIMIT 500`)
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
    ) {}

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

        const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
        const rows = db
            .prepare(`SELECT id, type, content, project_id, created_at, updated_at FROM user_memory ${where} ORDER BY updated_at DESC, created_at DESC LIMIT ${limit}`)
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
        return { settings: selection.settings, injected: { memory: selection.items } };
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

        const row = db.prepare('SELECT id, type, content, project_id, created_at, updated_at FROM user_memory WHERE id = ?').get(id);
        return { item: mapMemoryRow(row) };
    }

    async update(request: MemoryUpdateRequest): Promise<MemoryUpdateResponse> {
        const db = this.sqliteDb.db;
        const id = coerceString(request?.id);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        const existing = db.prepare('SELECT id FROM user_memory WHERE id = ?').get(id);
        if (!existing) throw createIpcError('NOT_FOUND', 'Memory item not found', { id });

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

        params.updated_at = toIsoNow();
        sets.push('updated_at = @updated_at');

        try {
            db.prepare(`UPDATE user_memory SET ${sets.join(', ')} WHERE id = @id`).run(params);
        } catch (error) {
            this.logger.error(`[memory] update failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to update memory item', { message: error instanceof Error ? error.message : String(error) });
        }

        const row = db.prepare('SELECT id, type, content, project_id, created_at, updated_at FROM user_memory WHERE id = ?').get(id);
        return { item: mapMemoryRow(row) };
    }

    async delete(request: MemoryDeleteRequest): Promise<MemoryDeleteResponse> {
        const db = this.sqliteDb.db;
        const id = coerceString(request?.id);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');

        const existing = db.prepare('SELECT id FROM user_memory WHERE id = ?').get(id);
        if (!existing) throw createIpcError('NOT_FOUND', 'Memory item not found', { id });

        db.prepare('DELETE FROM user_memory WHERE id = ?').run(id);
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

            const row = db.prepare('SELECT id, type, content, project_id, created_at, updated_at FROM user_memory WHERE id = ?').get(id);
            const item = mapMemoryRow(row);
            if (item.id) learned.push(item);
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

        const result = db.prepare("DELETE FROM user_memory WHERE id LIKE 'learned:%'").run() as { changes?: unknown };
        saveCounts(db, normalizeCounts(null));
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
