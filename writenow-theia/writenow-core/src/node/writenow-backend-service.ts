import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type { IpcChannel, IpcResponse } from '../common/ipc-generated';
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
