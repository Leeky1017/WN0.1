import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type { IpcErrorCode, RagEntityCard, RagRetrieveRequest, RagRetrieveResponse } from '../../common/ipc-generated';
import type { RetrievalServiceContract as RetrievalServiceContractShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { retrieveRagContext } from '../rag/retrieval';
import { VectorStore } from '../rag/vector-store';
import { IndexService } from './index-service';

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
 * Why: Expose the RAG retrieval pipeline to the frontend via the existing `invoke(channel, payload)` contract.
 * Failure semantics: MUST throw `ipcError`-shaped errors so `WritenowBackendService` can map them to `IpcResponse`.
 */
@injectable()
export class RetrievalService implements RetrievalServiceContractShape {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
        @inject(IndexService) private readonly indexService: IndexService,
        @inject(VectorStore) private readonly vectorStore: VectorStore,
    ) {}

    async retrieveContext(request: RagRetrieveRequest): Promise<RagRetrieveResponse> {
        const queryText = typeof request?.queryText === 'string' ? request.queryText : '';
        if (!queryText.trim()) throw createIpcError('INVALID_ARGUMENT', 'queryText is required');

        if (process.env.WN_E2E === '1') {
            try {
                await this.indexService.flush();
            } catch (error) {
                this.logger.warn(`[rag] flush skipped: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return retrieveRagContext({
            db: this.sqliteDb.db,
            logger: this.logger,
            embeddingService: null,
            vectorStore: this.vectorStore,
            queryText,
            budget: request?.budget,
        });
    }

    async searchEntities(queryText: string): Promise<{ characters: RagEntityCard[]; settings: RagEntityCard[] }> {
        const query = typeof queryText === 'string' ? queryText : '';
        if (!query.trim()) throw createIpcError('INVALID_ARGUMENT', 'queryText is required');

        const result = await retrieveRagContext({
            db: this.sqliteDb.db,
            logger: this.logger,
            embeddingService: null,
            vectorStore: this.vectorStore,
            queryText: query,
            budget: { maxChunks: 1, maxChars: 800, maxCharacters: 10, maxSettings: 10, cursor: '0' },
        });

        return { characters: result.characters, settings: result.settings };
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('rag:retrieve', async (_evt, payload) => {
            return this.retrieveContext(payload as RagRetrieveRequest);
        });
    }
}
