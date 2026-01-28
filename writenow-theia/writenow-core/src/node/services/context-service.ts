import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    ContextWritenowConversationsAnalysisUpdateRequest,
    ContextWritenowConversationsAnalysisUpdateResponse,
    ContextWritenowConversationsListRequest,
    ContextWritenowConversationsListResponse,
    ContextWritenowConversationsReadRequest,
    ContextWritenowConversationsReadResponse,
    ContextWritenowConversationsSaveRequest,
    ContextWritenowConversationsSaveResponse,
    ContextWritenowEnsureRequest,
    ContextWritenowEnsureResponse,
    ContextWritenowRulesGetRequest,
    ContextWritenowRulesGetResponse,
    ContextWritenowSettingsListRequest,
    ContextWritenowSettingsListResponse,
    ContextWritenowSettingsReadRequest,
    ContextWritenowSettingsReadResponse,
    ContextWritenowStatusRequest,
    ContextWritenowStatusResponse,
    ContextWritenowWatchStartRequest,
    ContextWritenowWatchStartResponse,
    ContextWritenowWatchStopRequest,
    ContextWritenowWatchStopResponse,
    IpcErrorCode,
    WritenowConversationAnalysis,
    WritenowConversationIndexItem,
    WritenowConversationMessage,
    WritenowConversationRecord,
    WritenowConversationSummaryQuality,
    WritenowLoaderError,
    WritenowRuleFragment,
    WritenowSettingsFile,
} from '../../common/ipc-generated';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { type SqliteDatabase } from '../database/init';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { WRITENOW_DATA_DIR } from '../writenow-data-dir';

type JsonReadResult =
    | { ok: true; value: unknown; updatedAtMs: number | null; raw: string }
    | { ok: false; error: { code: IpcErrorCode; message: string; details?: unknown }; raw?: string };

type Utf8ReadResult =
    | { ok: true; content: string; updatedAtMs: number | null }
    | { ok: false; error: { code: IpcErrorCode; message: string; details?: unknown } };

type ConversationIndexFile = {
    version: number;
    updatedAt: string;
    items: unknown[];
};

type ProjectContextState = {
    watching: boolean;
    watchers: fs.FSWatcher[];
    pending: NodeJS.Timeout | null;
    pendingChanged: Set<string>;
    rules: { loadedAtMs: number | null; fragments: WritenowRuleFragment[]; errors: WritenowLoaderError[] } | null;
    settingsIndex: { loadedAtMs: number | null; characters: string[]; settings: string[]; errors: WritenowLoaderError[] } | null;
};

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = { code, message, ...(typeof details === 'undefined' ? {} : { details }) };
    return error;
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function nowIso(): string {
    return new Date().toISOString();
}

function generateConversationId(): string {
    const rand = Math.random().toString(16).slice(2, 10);
    return `conv_${Date.now()}_${rand}`;
}

function ensureSafeFileName(fileName: unknown): string {
    const raw = coerceString(fileName);
    if (!raw) throw createIpcError('INVALID_ARGUMENT', 'Invalid file name', { fileName });

    const base = path.basename(raw);
    if (base !== raw) throw createIpcError('INVALID_ARGUMENT', 'Invalid file name', { fileName });
    if (base === '.' || base === '..') throw createIpcError('INVALID_ARGUMENT', 'Invalid file name', { fileName });
    if (!base.toLowerCase().endsWith('.md')) throw createIpcError('INVALID_ARGUMENT', 'Only .md files are supported', { fileName });
    return base;
}

function ensureSafeConversationId(value: unknown): string {
    const raw = coerceString(value);
    if (!raw) throw createIpcError('INVALID_ARGUMENT', 'conversationId is required');

    const base = path.basename(raw);
    if (base !== raw) throw createIpcError('INVALID_ARGUMENT', 'Invalid conversationId', { conversationId: value });
    if (base === '.' || base === '..') throw createIpcError('INVALID_ARGUMENT', 'Invalid conversationId', { conversationId: value });
    if (!/^[a-zA-Z0-9_-]+$/.test(base)) throw createIpcError('INVALID_ARGUMENT', 'Invalid conversationId', { conversationId: value });
    return base;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => coerceString(v)).filter(Boolean);
}

function normalizeUserPreferences(value: unknown): { accepted: string[]; rejected: string[] } {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    return {
        accepted: normalizeStringArray(obj?.accepted),
        rejected: normalizeStringArray(obj?.rejected),
    };
}

function normalizeSummaryQuality(value: unknown): WritenowConversationSummaryQuality {
    if (value === 'l2' || value === 'heuristic' || value === 'placeholder') return value;
    return 'placeholder';
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fsp.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function safeReadUtf8(filePath: string): Promise<Utf8ReadResult> {
    try {
        const stat = await fsp.stat(filePath);
        const content = await fsp.readFile(filePath, 'utf8');
        const updatedAtMs = typeof stat.mtimeMs === 'number' ? stat.mtimeMs : null;
        return { ok: true, content, updatedAtMs };
    } catch (error) {
        const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
        if (code === 'ENOENT') return { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } };
        if (code === 'EACCES' || code === 'EPERM') return { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Permission denied' } };
        return { ok: false, error: { code: 'IO_ERROR', message: 'I/O error', details: { cause: String(code || '') } } };
    }
}

async function safeReadJsonValue(filePath: string): Promise<JsonReadResult> {
    const raw = await safeReadUtf8(filePath);
    if (!raw.ok) return raw;
    try {
        const value = JSON.parse(raw.content) as unknown;
        return { ok: true, value, updatedAtMs: raw.updatedAtMs, raw: raw.content };
    } catch (error) {
        return {
            ok: false,
            error: {
                code: 'INVALID_ARGUMENT',
                message: 'Invalid JSON',
                details: { message: error instanceof Error ? error.message : String(error) },
            },
            raw: raw.content,
        };
    }
}

async function writeUtf8Atomic(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tmpPath = path.join(dir, `.${base}.tmp-${process.pid}-${Date.now()}`);

    try {
        await fsp.writeFile(tmpPath, content, 'utf8');
        await fsp.rename(tmpPath, filePath);
    } catch (error) {
        let cleanupError: unknown = null;
        try {
            await fsp.unlink(tmpPath);
        } catch (err) {
            cleanupError = err;
        }

        const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
        const cleanupCode = cleanupError && typeof cleanupError === 'object' ? (cleanupError as { code?: unknown }).code : null;
        throw createIpcError('IO_ERROR', 'Atomic write failed', {
            path: base,
            cause: String(code || ''),
            ...(cleanupError ? { cleanupCause: String(cleanupCode || ''), cleanupMessage: (cleanupError as { message?: unknown }).message } : {}),
        });
    }
}

function stableJsonStringify(value: unknown): string {
    const seen = new Set<unknown>();
    const normalize = (v: unknown): unknown => {
        if (v === null || typeof v !== 'object') return v;
        if (seen.has(v)) return null;
        seen.add(v);
        if (Array.isArray(v)) return v.map(normalize);
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
        const out: Record<string, unknown> = {};
        for (const k of keys) out[k] = normalize(obj[k]);
        return out;
    };
    return JSON.stringify(normalize(value), null, 2);
}

function normalizeInlineWhitespace(text: string): string {
    return (typeof text === 'string' ? text : '').replace(/\s+/g, ' ').trim();
}

function sliceCodePoints(text: string, maxCodePoints: number): string {
    const max = typeof maxCodePoints === 'number' && Number.isFinite(maxCodePoints) && maxCodePoints > 0 ? Math.floor(maxCodePoints) : 0;
    if (max <= 0) return '';
    const arr = Array.from(typeof text === 'string' ? text : '');
    if (arr.length <= max) return arr.join('');
    return arr.slice(0, max).join('');
}

function estimateTokensRough(text: string): number {
    // Why: Rough estimate for compaction thresholds; keep deterministic.
    return Math.ceil((typeof text === 'string' ? text.length : 0) / 2);
}

function shouldCompactConversation(stats: { messageCount: number; tokenEstimate: number }): boolean {
    // Why: Keep short conversations cheap to save; compact only when history is "long enough".
    return stats.messageCount >= 30 || stats.tokenEstimate >= 2400;
}

function buildHeuristicCompactSummary(record: WritenowConversationRecord): string {
    const skills = normalizeStringArray(record.analysis?.skillsUsed).sort((a, b) => a.localeCompare(b));
    const lastUser = [...record.messages].reverse().find((m) => m.role === 'user' && coerceString(m.content));
    const lastAssistant = [...record.messages].reverse().find((m) => m.role === 'assistant' && coerceString(m.content));
    const u = lastUser ? sliceCodePoints(normalizeInlineWhitespace(lastUser.content), 80) : '';
    const a = lastAssistant ? sliceCodePoints(normalizeInlineWhitespace(lastAssistant.content), 80) : '';
    const parts: string[] = [];
    if (skills.length > 0) parts.push(`skills=${skills.join(',')}`);
    if (u) parts.push(`U:${u}`);
    if (a) parts.push(`A:${a}`);
    return parts.length > 0 ? parts.join(' | ') : '(empty)';
}

function normalizeConversationMessage(value: unknown): WritenowConversationMessage | null {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    if (!obj) return null;
    const role = obj.role;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') return null;
    const content = coerceString(obj.content);
    if (!content) return null;
    const createdAt = coerceString(obj.createdAt) || nowIso();
    return { role, content, createdAt };
}

function normalizeConversationRecord(value: unknown): WritenowConversationRecord | null {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    if (!obj) return null;

    const version = obj.version;
    if (version !== 1) return null;

    const id = coerceString(obj.id);
    const articleId = coerceString(obj.articleId);
    const createdAt = coerceString(obj.createdAt);
    const updatedAt = coerceString(obj.updatedAt);
    if (!id || !articleId || !createdAt || !updatedAt) return null;

    const rawMessages = Array.isArray(obj.messages) ? obj.messages : [];
    const messages = rawMessages.map(normalizeConversationMessage).filter((m): m is WritenowConversationMessage => Boolean(m));

    const analysisObj = obj.analysis && typeof obj.analysis === 'object' && !Array.isArray(obj.analysis) ? (obj.analysis as Record<string, unknown>) : null;
    const summary = coerceString(analysisObj?.summary);
    const summaryQuality = normalizeSummaryQuality(analysisObj?.summaryQuality);
    const keyTopics = normalizeStringArray(analysisObj?.keyTopics);
    const skillsUsed = normalizeStringArray(analysisObj?.skillsUsed);
    const userPreferences = normalizeUserPreferences(analysisObj?.userPreferences);

    const analysis: WritenowConversationAnalysis = {
        summary,
        summaryQuality,
        keyTopics,
        skillsUsed,
        userPreferences,
    };

    return { version: 1, id, articleId, createdAt, updatedAt, messages, analysis };
}

function toConversationIndexItem(projectRoot: string, filePath: string, record: WritenowConversationRecord): WritenowConversationIndexItem {
    return {
        id: record.id,
        articleId: record.articleId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        messageCount: record.messages.length,
        summary: record.analysis.summary,
        summaryQuality: record.analysis.summaryQuality,
        keyTopics: record.analysis.keyTopics,
        skillsUsed: record.analysis.skillsUsed,
        userPreferences: record.analysis.userPreferences,
        fullPath: path.relative(projectRoot, filePath).split(path.sep).join('/'),
    };
}

function normalizeConversationIndexFile(value: unknown): ConversationIndexFile {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    const version = typeof obj?.version === 'number' && Number.isFinite(obj.version) ? obj.version : 1;
    const updatedAt = coerceString(obj?.updatedAt) || nowIso();
    const items = Array.isArray(obj?.items) ? obj.items : [];
    return { version, updatedAt, items };
}

function normalizeConversationIndexItem(value: unknown): WritenowConversationIndexItem | null {
    const obj = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    if (!obj) return null;
    const id = coerceString(obj.id);
    const articleId = coerceString(obj.articleId);
    const createdAt = coerceString(obj.createdAt);
    const updatedAt = coerceString(obj.updatedAt);
    const fullPath = coerceString(obj.fullPath);
    if (!id || !articleId || !createdAt || !updatedAt || !fullPath) return null;

    const messageCount = typeof obj.messageCount === 'number' && Number.isFinite(obj.messageCount) ? Math.max(0, Math.floor(obj.messageCount)) : 0;
    const summary = coerceString(obj.summary);
    const summaryQuality = normalizeSummaryQuality(obj.summaryQuality);
    const keyTopics = normalizeStringArray(obj.keyTopics);
    const skillsUsed = normalizeStringArray(obj.skillsUsed);
    const userPreferences = normalizeUserPreferences(obj.userPreferences);

    return {
        id,
        articleId,
        createdAt,
        updatedAt,
        messageCount,
        summary,
        summaryQuality,
        keyTopics,
        skillsUsed,
        userPreferences,
        fullPath,
    };
}

@injectable()
export class ContextService {
    private readonly stateByProjectId = new Map<string, ProjectContextState>();

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WRITENOW_DATA_DIR) private readonly dataDir: string,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('context:writenow:ensure', async (_evt, payload) => this.ensure(payload as ContextWritenowEnsureRequest));
        registry.handleInvoke('context:writenow:status', async (_evt, payload) => this.status(payload as ContextWritenowStatusRequest));
        registry.handleInvoke('context:writenow:watch:start', async (_evt, payload) => this.watchStart(payload as ContextWritenowWatchStartRequest));
        registry.handleInvoke('context:writenow:watch:stop', async (_evt, payload) => this.watchStop(payload as ContextWritenowWatchStopRequest));
        registry.handleInvoke('context:writenow:rules:get', async (_evt, payload) => this.getRules(payload as ContextWritenowRulesGetRequest));
        registry.handleInvoke('context:writenow:settings:list', async (_evt, payload) => this.listSettings(payload as ContextWritenowSettingsListRequest));
        registry.handleInvoke('context:writenow:settings:read', async (_evt, payload) => this.readSettings(payload as ContextWritenowSettingsReadRequest));
        registry.handleInvoke('context:writenow:conversations:save', async (_evt, payload) => this.saveConversation(payload as ContextWritenowConversationsSaveRequest));
        registry.handleInvoke('context:writenow:conversations:list', async (_evt, payload) => this.listConversations(payload as ContextWritenowConversationsListRequest));
        registry.handleInvoke('context:writenow:conversations:read', async (_evt, payload) => this.readConversation(payload as ContextWritenowConversationsReadRequest));
        registry.handleInvoke('context:writenow:conversations:analysis:update', async (_evt, payload) =>
            this.updateConversationAnalysis(payload as ContextWritenowConversationsAnalysisUpdateRequest),
        );
    }

    async ensure(request: ContextWritenowEnsureRequest): Promise<ContextWritenowEnsureResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const rootPath = this.getWritenowRoot(projectId);
        await this.ensureScaffold(projectId);
        return { projectId, rootPath, ensured: true };
    }

    async status(request: ContextWritenowStatusRequest): Promise<ContextWritenowStatusResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const rootPath = this.getWritenowRoot(projectId);
        const exists = await pathExists(rootPath);
        const state = this.getOrCreateState(projectId);
        return { projectId, rootPath, exists, watching: state.watching };
    }

    async watchStart(request: ContextWritenowWatchStartRequest): Promise<ContextWritenowWatchStartResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        await this.ensureScaffold(projectId);
        const state = this.getOrCreateState(projectId);
        if (state.watching) return { watching: true };

        state.watching = true;
        state.pendingChanged.clear();

        // Why: Mirrors the Electron watcher behavior, but Theia currently doesn't surface change notifications to the UI.
        const watchDirs = [this.getWritenowRulesDir(projectId), this.getWritenowCharactersDir(projectId), this.getWritenowSettingsDir(projectId), this.getWritenowConversationsDir(projectId)];

        for (const dir of watchDirs) {
            try {
                const watcher = fs.watch(dir, { recursive: false }, (_eventType, fileName) => {
                    const name = typeof fileName === 'string' ? fileName : '';
                    state.pendingChanged.add(`${dir}:${name}`);
                    if (state.pending) clearTimeout(state.pending);
                    state.pending = setTimeout(() => {
                        state.pending = null;
                        // Best-effort cache refresh.
                        void this.refreshCaches(projectId).catch(() => undefined);
                        state.pendingChanged.clear();
                    }, 120);
                });
                state.watchers.push(watcher);
            } catch (error) {
                this.logger.warn(`[context] watch skipped: ${dir} (${error instanceof Error ? error.message : String(error)})`);
            }
        }

        return { watching: true };
    }

    async watchStop(request: ContextWritenowWatchStopRequest): Promise<ContextWritenowWatchStopResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const state = this.getOrCreateState(projectId);
        for (const watcher of state.watchers) {
            try {
                watcher.close();
            } catch {
                // ignore
            }
        }
        state.watchers = [];
        state.watching = false;
        if (state.pending) clearTimeout(state.pending);
        state.pending = null;
        state.pendingChanged.clear();
        return { watching: false };
    }

    async getRules(request: ContextWritenowRulesGetRequest): Promise<ContextWritenowRulesGetResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const refresh = request?.refresh === true;
        const state = this.getOrCreateState(projectId);
        if (refresh || !state.rules?.loadedAtMs) {
            state.rules = await this.loadRulesCache(projectId);
        }

        return {
            projectId,
            rootPath: this.getWritenowRoot(projectId),
            loadedAtMs: state.rules.loadedAtMs,
            fragments: state.rules.fragments,
            errors: state.rules.errors,
        };
    }

    async listSettings(request: ContextWritenowSettingsListRequest): Promise<ContextWritenowSettingsListResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const refresh = request?.refresh === true;
        const state = this.getOrCreateState(projectId);
        if (refresh || !state.settingsIndex?.loadedAtMs) {
            state.settingsIndex = await this.loadSettingsIndex(projectId);
        }

        return {
            projectId,
            rootPath: this.getWritenowRoot(projectId),
            loadedAtMs: state.settingsIndex.loadedAtMs,
            characters: state.settingsIndex.characters,
            settings: state.settingsIndex.settings,
            errors: state.settingsIndex.errors,
        };
    }

    async readSettings(request: ContextWritenowSettingsReadRequest): Promise<ContextWritenowSettingsReadResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const result = await this.readSettingsFiles(projectId, request);
        return { projectId, rootPath: this.getWritenowRoot(projectId), ...result };
    }

    async saveConversation(request: ContextWritenowConversationsSaveRequest): Promise<ContextWritenowConversationsSaveResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const conv = request?.conversation;
        const articleId = coerceString(conv?.articleId);
        if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'conversation.articleId is required');

        const explicitId = coerceString(conv?.id);
        const conversationId = explicitId ? ensureSafeConversationId(explicitId) : generateConversationId();
        const createdAt = coerceString(conv?.createdAt) || nowIso();
        const updatedAt = coerceString(conv?.updatedAt) || createdAt;

        const rawMessages = Array.isArray(conv?.messages) ? conv.messages : [];
        const messages = rawMessages.map(normalizeConversationMessage).filter((m): m is WritenowConversationMessage => Boolean(m));

        const analysis: WritenowConversationAnalysis = {
            summary: '',
            summaryQuality: 'placeholder',
            keyTopics: [],
            skillsUsed: normalizeStringArray(conv?.skillsUsed),
            userPreferences: normalizeUserPreferences(conv?.userPreferences),
        };

        let record: WritenowConversationRecord = {
            version: 1,
            id: conversationId,
            articleId,
            createdAt,
            updatedAt,
            messages,
            analysis,
        };

        await this.ensureScaffold(projectId);
        const filePath = this.getConversationFilePath(projectId, conversationId);

        // P2-001: Full (file) -> Compact (SQLite) compaction for long conversations.
        try {
            const tokenEstimate = messages.reduce((sum, m) => sum + estimateTokensRough(m.content), 0);
            const messageCount = messages.length;
            const stats = { messageCount, tokenEstimate };
            if (shouldCompactConversation(stats)) {
                const summaryText = buildHeuristicCompactSummary(record);
                record = {
                    ...record,
                    analysis: {
                        ...record.analysis,
                        summary: summaryText,
                        summaryQuality: 'heuristic',
                    },
                };
                this.upsertConversationCompact({
                    projectId,
                    filePath,
                    record,
                    messageCount,
                    tokenEstimate,
                    reason: 'threshold',
                    threshold: { messageCount: 30, tokenEstimate: 2400 },
                });
            }
        } catch (error) {
            // Why: Compaction must be best-effort; never block saving the full conversation record.
            this.logger.warn(`[context] compaction skipped: ${error instanceof Error ? error.message : String(error)}`);
        }

        await writeUtf8Atomic(filePath, JSON.stringify(record, null, 2) + '\n');

        const indexLoaded = await this.loadConversationIndex(projectId);
        const nextItems = indexLoaded.index.items.filter((item) => item.id !== conversationId);
        const indexItem = toConversationIndexItem(this.getWritenowRoot(projectId), filePath, record);
        nextItems.push(indexItem);
        nextItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

        const nextIndex = { version: 1, updatedAt: nowIso(), items: nextItems };
        await writeUtf8Atomic(indexLoaded.indexPath, JSON.stringify(nextIndex, null, 2) + '\n');

        return { saved: true, index: indexItem };
    }

    async listConversations(request: ContextWritenowConversationsListRequest): Promise<ContextWritenowConversationsListResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const articleId = coerceString(request?.articleId);
        const limitRaw = request?.limit;
        const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 50;

        const loaded = await this.loadConversationIndex(projectId);
        const filtered = articleId ? loaded.index.items.filter((item) => item.articleId === articleId) : loaded.index.items;

        return {
            projectId,
            rootPath: this.getWritenowRoot(projectId),
            loadedAtMs: loaded.loadedAtMs,
            items: filtered.slice(0, limit),
            errors: loaded.errors,
        };
    }

    async readConversation(request: ContextWritenowConversationsReadRequest): Promise<ContextWritenowConversationsReadResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const conversationId = ensureSafeConversationId(request?.conversationId);
        const filePath = this.getConversationFilePath(projectId, conversationId);
        const parsed = await safeReadJsonValue(filePath);
        if (!parsed.ok) throw createIpcError(parsed.error.code, parsed.error.message, { path: this.toRelPath(projectId, filePath), details: parsed.error.details });

        const record = normalizeConversationRecord(parsed.value);
        if (!record) throw createIpcError('IO_ERROR', 'Conversation file is corrupted', { path: this.toRelPath(projectId, filePath) });

        return { projectId, rootPath: this.getWritenowRoot(projectId), conversation: record };
    }

    async updateConversationAnalysis(
        request: ContextWritenowConversationsAnalysisUpdateRequest,
    ): Promise<ContextWritenowConversationsAnalysisUpdateResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const conversationId = ensureSafeConversationId(request?.conversationId);
        const analysis = request?.analysis;
        const summary = typeof analysis?.summary === 'string' ? analysis.summary : '';
        if (!summary.trim()) throw createIpcError('INVALID_ARGUMENT', 'analysis.summary is required');

        const filePath = this.getConversationFilePath(projectId, conversationId);
        const parsed = await safeReadJsonValue(filePath);
        if (!parsed.ok) throw createIpcError(parsed.error.code, parsed.error.message, { path: this.toRelPath(projectId, filePath), details: parsed.error.details });

        const record = normalizeConversationRecord(parsed.value);
        if (!record) throw createIpcError('IO_ERROR', 'Conversation file is corrupted', { path: this.toRelPath(projectId, filePath) });

        const updatedAt = nowIso();
        const nextRecord: WritenowConversationRecord = {
            ...record,
            updatedAt,
            analysis: {
                summary: summary.trim(),
                summaryQuality: normalizeSummaryQuality(analysis?.summaryQuality),
                keyTopics: normalizeStringArray(analysis?.keyTopics),
                skillsUsed: normalizeStringArray(analysis?.skillsUsed),
                userPreferences: normalizeUserPreferences(analysis?.userPreferences),
            },
        };

        await writeUtf8Atomic(filePath, JSON.stringify(nextRecord, null, 2) + '\n');

        // P2-001: Keep Compact store in sync with analysis updates (heuristic/L2).
        try {
            const tokenEstimate = nextRecord.messages.reduce((sum, m) => sum + estimateTokensRough(m.content), 0);
            const messageCount = nextRecord.messages.length;
            this.upsertConversationCompact({
                projectId,
                filePath,
                record: nextRecord,
                messageCount,
                tokenEstimate,
                reason: 'analysis_update',
                threshold: { messageCount: 0, tokenEstimate: 0 },
            });
        } catch (error) {
            this.logger.warn(`[context] compact upsert skipped: ${error instanceof Error ? error.message : String(error)}`);
        }

        const indexLoaded = await this.loadConversationIndex(projectId);
        const nextItems = indexLoaded.index.items.filter((item) => item.id !== conversationId);
        const indexItem = toConversationIndexItem(this.getWritenowRoot(projectId), filePath, nextRecord);
        nextItems.push(indexItem);
        nextItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

        const nextIndex = { version: 1, updatedAt: nowIso(), items: nextItems };
        await writeUtf8Atomic(indexLoaded.indexPath, JSON.stringify(nextIndex, null, 2) + '\n');

        return { updated: true, index: indexItem };
    }

    /**
     * Persist Compact summary for long sessions.
     *
     * Why: Keep prompt injection cheap by defaulting to Compact summaries, while preserving Full records on disk
     * with a project-relative reference for audit/backtrace.
     *
     * Failure: Must be best-effort; callers wrap this in try/catch so conversation persistence never blocks.
     */
    private upsertConversationCompact(input: {
        projectId: string;
        filePath: string;
        record: WritenowConversationRecord;
        messageCount: number;
        tokenEstimate: number;
        reason: 'threshold' | 'analysis_update';
        threshold: { messageCount: number; tokenEstimate: number };
    }): void {
        const db: SqliteDatabase = this.sqliteDb.db;
        const rel = this.toRelPath(input.projectId, input.filePath);
        const fullRef = `.writenow/${rel}`;
        const stats = { messageCount: input.messageCount, tokenEstimate: input.tokenEstimate };
        const skillsUsed = normalizeStringArray(input.record.analysis.skillsUsed).sort((a, b) => a.localeCompare(b));

        const compact = {
            version: 1,
            projectId: input.projectId,
            conversationId: input.record.id,
            articleId: input.record.articleId,
            fullRef,
            stats,
            summary: input.record.analysis.summary,
            summaryQuality: input.record.analysis.summaryQuality,
            skillsUsed,
            userPreferences: normalizeUserPreferences(input.record.analysis.userPreferences),
        };

        const compactJson = stableJsonStringify(compact);

        db.prepare(
            `INSERT INTO conversation_compacts
              (project_id, conversation_id, article_id, full_ref, compact_json, summary, summary_quality, message_count, token_estimate, created_at, updated_at, compacted_at)
              VALUES (@project_id, @conversation_id, @article_id, @full_ref, @compact_json, @summary, @summary_quality, @message_count, @token_estimate, @created_at, @updated_at, @compacted_at)
              ON CONFLICT(project_id, conversation_id) DO UPDATE SET
                article_id = excluded.article_id,
                full_ref = excluded.full_ref,
                compact_json = excluded.compact_json,
                summary = excluded.summary,
                summary_quality = excluded.summary_quality,
                message_count = excluded.message_count,
                token_estimate = excluded.token_estimate,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at,
                compacted_at = excluded.compacted_at`,
        ).run({
            project_id: input.projectId,
            conversation_id: input.record.id,
            article_id: input.record.articleId,
            full_ref: fullRef,
            compact_json: compactJson,
            summary: input.record.analysis.summary,
            summary_quality: input.record.analysis.summaryQuality,
            message_count: input.messageCount,
            token_estimate: input.tokenEstimate,
            created_at: input.record.createdAt,
            updated_at: input.record.updatedAt,
            compacted_at: input.record.updatedAt,
        });

        db.prepare(
            `INSERT OR REPLACE INTO conversation_compaction_events
              (id, project_id, conversation_id, article_id, triggered_at, reason, threshold_json, stats_json, full_ref, compact_ref)
              VALUES (@id, @project_id, @conversation_id, @article_id, @triggered_at, @reason, @threshold_json, @stats_json, @full_ref, @compact_ref)`,
        ).run({
            id: randomUUID(),
            project_id: input.projectId,
            conversation_id: input.record.id,
            article_id: input.record.articleId,
            triggered_at: input.record.updatedAt,
            reason: input.reason,
            threshold_json: stableJsonStringify(input.threshold),
            stats_json: stableJsonStringify(stats),
            full_ref: fullRef,
            compact_ref: `db:conversation_compacts:${input.projectId}:${input.record.id}`,
        });
    }

    private getOrCreateState(projectId: string): ProjectContextState {
        const key = coerceString(projectId);
        const existing = this.stateByProjectId.get(key);
        if (existing) return existing;
        const created: ProjectContextState = {
            watching: false,
            watchers: [],
            pending: null,
            pendingChanged: new Set(),
            rules: null,
            settingsIndex: null,
        };
        this.stateByProjectId.set(key, created);
        return created;
    }

    private getProjectsDir(): string {
        return path.join(this.dataDir, 'projects');
    }

    private getProjectDir(projectId: string): string {
        const id = coerceString(projectId);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        return path.join(this.getProjectsDir(), id);
    }

    private getWritenowRoot(projectId: string): string {
        return path.join(this.getProjectDir(projectId), '.writenow');
    }

    private getWritenowRulesDir(projectId: string): string {
        return path.join(this.getWritenowRoot(projectId), 'rules');
    }

    private getWritenowCharactersDir(projectId: string): string {
        return path.join(this.getWritenowRoot(projectId), 'characters');
    }

    private getWritenowSettingsDir(projectId: string): string {
        return path.join(this.getWritenowRoot(projectId), 'settings');
    }

    private getWritenowConversationsDir(projectId: string): string {
        return path.join(this.getWritenowRoot(projectId), 'conversations');
    }

    private getWritenowCacheDir(projectId: string): string {
        return path.join(this.getWritenowRoot(projectId), 'cache');
    }

    private getConversationIndexPath(projectId: string): string {
        return path.join(this.getWritenowConversationsDir(projectId), 'index.json');
    }

    private getConversationFilePath(projectId: string, conversationId: string): string {
        const safeId = ensureSafeConversationId(conversationId);
        return path.join(this.getWritenowConversationsDir(projectId), `${safeId}.json`);
    }

    private toRelPath(projectId: string, absolutePath: string): string {
        const root = this.getWritenowRoot(projectId);
        const rel = path.relative(root, absolutePath);
        return rel.split(path.sep).join('/');
    }

    private async ensureScaffold(projectId: string): Promise<void> {
        const root = this.getWritenowRoot(projectId);
        const dirs = [
            root,
            this.getWritenowRulesDir(projectId),
            this.getWritenowCharactersDir(projectId),
            this.getWritenowSettingsDir(projectId),
            this.getWritenowConversationsDir(projectId),
            this.getWritenowCacheDir(projectId),
        ];

        for (const dir of dirs) {
            await fsp.mkdir(dir, { recursive: true });
        }

        const projectJsonPath = path.join(root, 'project.json');
        if (!(await pathExists(projectJsonPath))) {
            await fsp.writeFile(projectJsonPath, JSON.stringify({ version: 1 }, null, 2) + '\n', 'utf8').catch(() => undefined);
        }
    }

    private async loadRulesCache(projectId: string): Promise<{ loadedAtMs: number; fragments: WritenowRuleFragment[]; errors: WritenowLoaderError[] }> {
        await this.ensureScaffold(projectId);
        const rulesDir = this.getWritenowRulesDir(projectId);
        const files: Array<{ kind: WritenowRuleFragment['kind']; name: string; reader: (p: string) => Promise<Utf8ReadResult> }> = [
            { kind: 'style', name: 'style.md', reader: safeReadUtf8 },
            { kind: 'terminology', name: 'terminology.json', reader: safeReadUtf8 },
            { kind: 'constraints', name: 'constraints.json', reader: safeReadUtf8 },
        ];

        const fragments: WritenowRuleFragment[] = [];
        const errors: WritenowLoaderError[] = [];

        for (const file of files) {
            const fullPath = path.join(rulesDir, file.name);
            const result = await file.reader(fullPath);
            const relPath = this.toRelPath(projectId, fullPath);
            if (result.ok) {
                fragments.push({ kind: file.kind, path: relPath, content: result.content, updatedAtMs: result.updatedAtMs });
            } else {
                errors.push({ path: relPath, code: result.error.code, message: result.error.message, details: result.error.details });
            }
        }

        return { loadedAtMs: Date.now(), fragments, errors };
    }

    private async loadSettingsIndex(projectId: string): Promise<{ loadedAtMs: number; characters: string[]; settings: string[]; errors: WritenowLoaderError[] }> {
        await this.ensureScaffold(projectId);

        const charactersDir = this.getWritenowCharactersDir(projectId);
        const settingsDir = this.getWritenowSettingsDir(projectId);

        const errors: WritenowLoaderError[] = [];

        const listMd = async (dirPath: string): Promise<string[]> => {
            try {
                const entries = await fsp.readdir(dirPath, { withFileTypes: true });
                return entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md')).map((e) => e.name);
            } catch (error) {
                const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
                errors.push({
                    path: this.toRelPath(projectId, dirPath),
                    code: code === 'ENOENT' ? 'NOT_FOUND' : 'IO_ERROR',
                    message: code === 'ENOENT' ? 'Not found' : 'I/O error',
                    details: { cause: String(code || '') },
                });
                return [];
            }
        };

        const characters = await listMd(charactersDir);
        const settings = await listMd(settingsDir);
        characters.sort((a, b) => a.localeCompare(b));
        settings.sort((a, b) => a.localeCompare(b));

        return { loadedAtMs: Date.now(), characters, settings, errors };
    }

    private async readSettingsFiles(
        projectId: string,
        request: { characters?: string[]; settings?: string[] },
    ): Promise<{ files: WritenowSettingsFile[]; errors: WritenowLoaderError[] }> {
        await this.ensureScaffold(projectId);

        const requestedCharacters = Array.isArray(request.characters) ? request.characters : [];
        const requestedSettings = Array.isArray(request.settings) ? request.settings : [];

        const files: WritenowSettingsFile[] = [];
        const errors: WritenowLoaderError[] = [];

        for (const name of requestedCharacters) {
            const safe = ensureSafeFileName(name);
            const fullPath = path.join(this.getWritenowCharactersDir(projectId), safe);
            const result = await safeReadUtf8(fullPath);
            const relPath = this.toRelPath(projectId, fullPath);
            if (result.ok) {
                files.push({ path: relPath, content: result.content, updatedAtMs: result.updatedAtMs });
            } else {
                errors.push({ path: relPath, code: result.error.code, message: result.error.message, details: result.error.details });
            }
        }

        for (const name of requestedSettings) {
            const safe = ensureSafeFileName(name);
            const fullPath = path.join(this.getWritenowSettingsDir(projectId), safe);
            const result = await safeReadUtf8(fullPath);
            const relPath = this.toRelPath(projectId, fullPath);
            if (result.ok) {
                files.push({ path: relPath, content: result.content, updatedAtMs: result.updatedAtMs });
            } else {
                errors.push({ path: relPath, code: result.error.code, message: result.error.message, details: result.error.details });
            }
        }

        return { files, errors };
    }

    private async rebuildConversationIndex(projectId: string, errors: WritenowLoaderError[]): Promise<{ index: { version: 1; updatedAt: string; items: WritenowConversationIndexItem[] }; errors: WritenowLoaderError[] }> {
        await this.ensureScaffold(projectId);
        const convDir = this.getWritenowConversationsDir(projectId);
        let entries: Array<{ name: string; isFile(): boolean }> = [];
        try {
            entries = await fsp.readdir(convDir, { withFileTypes: true });
        } catch (error) {
            const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
            errors.push({
                path: this.toRelPath(projectId, convDir),
                code: code === 'ENOENT' ? 'NOT_FOUND' : 'IO_ERROR',
                message: code === 'ENOENT' ? 'Not found' : 'I/O error',
                details: { cause: String(code || '') },
            });
            return { index: { version: 1, updatedAt: nowIso(), items: [] }, errors };
        }

        const items: WritenowConversationIndexItem[] = [];
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            if (!entry.name.endsWith('.json')) continue;
            if (entry.name === 'index.json') continue;
            const fullPath = path.join(convDir, entry.name);
            const parsed = await safeReadJsonValue(fullPath);
            if (!parsed.ok) {
                errors.push({ path: this.toRelPath(projectId, fullPath), code: parsed.error.code, message: parsed.error.message, details: parsed.error.details });
                continue;
            }
            const record = normalizeConversationRecord(parsed.value);
            if (!record) {
                errors.push({ path: this.toRelPath(projectId, fullPath), code: 'IO_ERROR', message: 'Conversation file is corrupted' });
                continue;
            }
            items.push(toConversationIndexItem(this.getWritenowRoot(projectId), fullPath, record));
        }

        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
        return { index: { version: 1, updatedAt: nowIso(), items }, errors };
    }

    private async loadConversationIndex(projectId: string): Promise<{
        ok: true;
        loadedAtMs: number;
        index: { version: 1; updatedAt: string; items: WritenowConversationIndexItem[] };
        errors: WritenowLoaderError[];
        indexPath: string;
    }> {
        await this.ensureScaffold(projectId);
        const indexPath = this.getConversationIndexPath(projectId);
        const parsed = await safeReadJsonValue(indexPath);

        const errors: WritenowLoaderError[] = [];
        if (parsed.ok) {
            const normalized = normalizeConversationIndexFile(parsed.value);
            const items = normalized.items.map(normalizeConversationIndexItem).filter((item): item is WritenowConversationIndexItem => Boolean(item));
            return {
                ok: true,
                loadedAtMs: Date.now(),
                index: { version: 1, updatedAt: nowIso(), items },
                errors,
                indexPath,
            };
        }

        if (parsed.error.code !== 'NOT_FOUND') {
            errors.push({ path: this.toRelPath(projectId, indexPath), code: parsed.error.code, message: parsed.error.message, details: parsed.error.details });
            const backupPath = path.join(this.getWritenowConversationsDir(projectId), `index.corrupt-${Date.now()}.json`);
            try {
                if (typeof parsed.raw === 'string' && parsed.raw) {
                    await writeUtf8Atomic(backupPath, parsed.raw);
                }
            } catch (backupError) {
                const code = backupError && typeof backupError === 'object' ? (backupError as { code?: unknown }).code : null;
                errors.push({
                    path: this.toRelPath(projectId, backupPath),
                    code: typeof code === 'string' ? 'IO_ERROR' : 'INTERNAL',
                    message: 'Failed to back up corrupt conversation index',
                    details: { cause: String(code || ''), message: backupError instanceof Error ? backupError.message : String(backupError) },
                });
            }
        }

        const rebuilt = await this.rebuildConversationIndex(projectId, errors);
        return { ok: true, loadedAtMs: Date.now(), index: rebuilt.index, errors: rebuilt.errors, indexPath };
    }

    private async refreshCaches(projectId: string): Promise<void> {
        const state = this.getOrCreateState(projectId);
        try {
            state.rules = await this.loadRulesCache(projectId);
        } catch {
            // ignore
        }
        try {
            state.settingsIndex = await this.loadSettingsIndex(projectId);
        } catch {
            // ignore
        }
    }
}
