import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    AiProxySettings,
    AiProxySettingsGetResponse,
    AiProxySettingsUpdateRequest,
    AiProxySettingsUpdateResponse,
    AiProxyTestRequest,
    AiProxyTestResponse,
    IpcChannel,
    IpcResponse,
} from '../common/ipc-generated';
import type { WritenowRpcService } from '../common/writenow-protocol';

import { TheiaInvokeRegistry, toIpcError } from './theia-invoke-adapter';
import { WritenowSqliteDb } from './database/writenow-sqlite-db';
import { CharactersService } from './services/characters-service';
import { ContextService } from './services/context-service';
import { EmbeddingRpcService } from './services/embedding-rpc-service';
import { ExportService } from './services/export-service';
import { FilesService } from './services/files-service';
import { IndexService } from './services/index-service';
import { KnowledgeGraphService } from './services/knowledge-graph-service';
import { MemoryService } from './services/memory-service';
import { ProjectsService } from './services/projects-service';
import { RetrievalService } from './services/retrieval-service';
import { SearchService } from './services/search-service';
import { SnapshotService } from './services/snapshot-service';
import { StatsService } from './services/stats-service';
import { VersionService } from './services/version-service';

@injectable()
export class WritenowBackendService implements WritenowRpcService {
    private readonly registry = new TheiaInvokeRegistry();

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) sqliteDb: WritenowSqliteDb,
        @inject(ProjectsService) projectsService: ProjectsService,
        @inject(KnowledgeGraphService) knowledgeGraphService: KnowledgeGraphService,
        @inject(FilesService) filesService: FilesService,
        @inject(VersionService) versionService: VersionService,
        @inject(IndexService) _indexService: IndexService,
        @inject(EmbeddingRpcService) embeddingRpcService: EmbeddingRpcService,
        @inject(RetrievalService) retrievalService: RetrievalService,
        @inject(SearchService) searchService: SearchService,
        @inject(ContextService) contextService: ContextService,
        @inject(CharactersService) charactersService: CharactersService,
        @inject(MemoryService) memoryService: MemoryService,
        @inject(StatsService) statsService: StatsService,
        @inject(SnapshotService) snapshotService: SnapshotService,
        @inject(ExportService) exportService: ExportService,
    ) {
        // Why: Task 009 requires the DB to be initialized at backend startup (not lazily on first request),
        // so failures surface early and are actionable.
        sqliteDb.ensureReady();

        projectsService.register(this.registry);
        knowledgeGraphService.register(this.registry);
        filesService.register(this.registry);
        versionService.register(this.registry);
        embeddingRpcService.register(this.registry);
        retrievalService.register(this.registry);
        searchService.register(this.registry);
        contextService.register(this.registry);
        charactersService.register(this.registry);
        memoryService.register(this.registry);

        // Stats service (stats:getToday, stats:getRange, stats:increment)
        this.registry.handleInvoke('stats:getToday', (_event: unknown, payload: unknown) => statsService.getToday(payload as never));
        this.registry.handleInvoke('stats:getRange', (_event: unknown, payload: unknown) => statsService.getRange(payload as never));
        this.registry.handleInvoke('stats:increment', (_event: unknown, payload: unknown) => statsService.increment(payload as never));

        // Snapshot service (file:snapshot:latest, file:snapshot:write)
        this.registry.handleInvoke('file:snapshot:latest', (_event: unknown, payload: unknown) => snapshotService.getLatestSnapshot(payload as never));
        this.registry.handleInvoke('file:snapshot:write', (_event: unknown, payload: unknown) => snapshotService.writeSnapshot(payload as never));

        // Export service (export:markdown, export:docx, export:pdf)
        this.registry.handleInvoke('export:markdown', (_event: unknown, payload: unknown) => exportService.exportMarkdown(payload as never));
        this.registry.handleInvoke('export:docx', (_event: unknown, payload: unknown) => exportService.exportDocx(payload as never));
        this.registry.handleInvoke('export:pdf', (_event: unknown, payload: unknown) => exportService.exportPdf(payload as never));

        // AI Proxy settings (ai:proxy:settings:get, ai:proxy:settings:update, ai:proxy:test)
        const db = sqliteDb.db;
        this.registry.handleInvoke('ai:proxy:settings:get', (): AiProxySettingsGetResponse => {
            return { settings: this.readAiProxySettings(db) };
        });
        this.registry.handleInvoke('ai:proxy:settings:update', (_event: unknown, payload: unknown): AiProxySettingsUpdateResponse => {
            const request = payload as AiProxySettingsUpdateRequest;
            if (typeof request?.enabled === 'boolean') {
                this.writeSetting(db, 'ai.proxy.enabled', request.enabled);
            }
            if (typeof request?.baseUrl === 'string') {
                this.writeSetting(db, 'ai.proxy.baseUrl', request.baseUrl.replace(/\/+$/, ''));
            }
            if (typeof request?.apiKey === 'string') {
                this.writeSetting(db, 'ai.proxy.apiKey', request.apiKey);
            }
            this.logger.info('[ai-proxy] settings updated');
            return { settings: this.readAiProxySettings(db) };
        });
        this.registry.handleInvoke('ai:proxy:test', async (_event: unknown, payload: unknown): Promise<AiProxyTestResponse> => {
            const request = payload as AiProxyTestRequest;
            const baseUrl = typeof request?.baseUrl === 'string' ? request.baseUrl.replace(/\/+$/, '') : '';
            if (!baseUrl) {
                return { success: false, message: 'baseUrl 是必填项' };
            }
            const apiKey = typeof request?.apiKey === 'string' ? request.apiKey.trim() : '';
            const modelsUrl = `${baseUrl}/v1/models`;

            try {
                const headers: Record<string, string> = { 'content-type': 'application/json' };
                if (apiKey) headers.authorization = `Bearer ${apiKey}`;

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(modelsUrl, {
                    method: 'GET',
                    headers,
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    return { success: false, message: `HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}` };
                }

                const json = await res.json().catch(() => null) as { data?: Array<{ id?: unknown }> } | null;
                const models = Array.isArray(json?.data)
                    ? json.data.map((m) => (typeof m?.id === 'string' ? m.id : '')).filter(Boolean).slice(0, 20)
                    : [];

                return { success: true, message: `连接成功，共 ${models.length} 个模型可用`, models };
            } catch (error: unknown) {
                const err = error as { name?: string; message?: string };
                if (err?.name === 'AbortError') {
                    return { success: false, message: '连接超时（10秒）' };
                }
                return { success: false, message: err?.message || '连接失败' };
            }
        });
    }

    private readSetting(db: import('./database/init').SqliteDatabase, key: string): string | null {
        try {
            const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: unknown } | undefined;
            if (row && typeof row.value === 'string') {
                return JSON.parse(row.value) as string;
            }
        } catch {
            // ignore parse errors
        }
        return null;
    }

    private readSettingBoolean(db: import('./database/init').SqliteDatabase, key: string): boolean | null {
        try {
            const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: unknown } | undefined;
            if (row && typeof row.value === 'string') {
                const parsed = JSON.parse(row.value);
                if (typeof parsed === 'boolean') return parsed;
            }
        } catch {
            // ignore parse errors
        }
        return null;
    }

    private writeSetting(db: import('./database/init').SqliteDatabase, key: string, value: unknown): void {
        try {
            db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
                key,
                JSON.stringify(value),
            );
        } catch {
            // ignore write errors
        }
    }

    private readAiProxySettings(db: import('./database/init').SqliteDatabase): AiProxySettings {
        // Env vars take precedence over SQLite
        const envEnabled = process.env.WN_AI_PROXY_ENABLED;
        const envBaseUrl = process.env.WN_AI_PROXY_BASE_URL;
        const envApiKey = process.env.WN_AI_PROXY_API_KEY;

        let enabled = false;
        if (envEnabled !== undefined) {
            enabled = envEnabled === 'true' || envEnabled === '1';
        } else {
            const fromDb = this.readSettingBoolean(db, 'ai.proxy.enabled');
            if (fromDb !== null) enabled = fromDb;
        }

        let baseUrl = '';
        if (envBaseUrl) {
            baseUrl = envBaseUrl.replace(/\/+$/, '');
        } else {
            const fromDb = this.readSetting(db, 'ai.proxy.baseUrl');
            if (fromDb) baseUrl = fromDb.replace(/\/+$/, '');
        }

        let apiKey = '';
        let hasApiKey = false;
        if (envApiKey && envApiKey.trim()) {
            apiKey = '••••••••';
            hasApiKey = true;
        } else {
            const fromDb = this.readSetting(db, 'ai.proxy.apiKey');
            if (fromDb && fromDb.trim()) {
                apiKey = '••••••••';
                hasApiKey = true;
            }
        }

        return { enabled, baseUrl, apiKey, hasApiKey };
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
}
