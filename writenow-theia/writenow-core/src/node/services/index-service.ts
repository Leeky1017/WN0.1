import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type { IpcErrorCode } from '../../common/ipc-generated';
import { EmbeddingService as EmbeddingServiceToken } from '../../common/writenow-protocol';
import type { EmbeddingService as EmbeddingServiceShape } from '../../common/writenow-protocol';
import { RagIndexer } from '../rag/indexer';
import { VectorStore } from '../rag/vector-store';
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

/**
 * Why: Centralize RAG indexing so file CRUD can enqueue updates without owning indexing state.
 * This keeps dependencies explicit (FilesService → IndexService) and allows retrieval to flush indexing
 * deterministically in E2E mode.
 */
@injectable()
export class IndexService {
    private readonly sqliteDb: WritenowSqliteDb;
    private readonly ragIndexer: RagIndexer;

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) sqliteDb: WritenowSqliteDb,
        @inject(EmbeddingServiceToken) embeddingService: EmbeddingServiceShape,
        @inject(VectorStore) vectorStore: VectorStore,
    ) {
        this.sqliteDb = sqliteDb;
        this.ragIndexer = new RagIndexer({
            db: sqliteDb.db,
            logger,
            embeddingService,
            vectorStore,
        });
    }

    indexArticle(articleId: string): void {
        const id = typeof articleId === 'string' ? articleId.trim() : '';
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'articleId is required');
        this.ragIndexer.enqueueArticle(id);
    }

    async indexProject(projectId: string): Promise<{ queued: number }> {
        const id = typeof projectId === 'string' ? projectId.trim() : '';
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');

        const rows = this.sqliteDb.db.prepare('SELECT id FROM articles WHERE project_id = ?').all(id) as Array<{ id?: unknown }>;
        const articleIds = rows.map((row) => (typeof row?.id === 'string' ? row.id : '')).filter(Boolean);
        for (const articleId of articleIds) this.ragIndexer.enqueueArticle(articleId);
        this.logger.info(`[rag-indexer] queued project index: ${id} (${articleIds.length} articles)`);
        return { queued: articleIds.length };
    }

    async flush(): Promise<void> {
        await this.ragIndexer.flush();
    }

    async handleDeletedArticle(articleId: string): Promise<void> {
        await this.ragIndexer.handleDeletedArticle(articleId);
    }
}
