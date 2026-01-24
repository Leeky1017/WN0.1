import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    EmbeddingEncodeRequest,
    EmbeddingEncodeResponse,
    EmbeddingIndexRequest,
    EmbeddingIndexResponse,
    IpcErrorCode,
} from '../../common/ipc-generated';
import { EmbeddingService as EmbeddingServiceToken } from '../../common/writenow-protocol';
import type { EmbeddingService as EmbeddingServiceShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { DEFAULT_EMBEDDING_MODEL_ID } from '../embedding/embedding-service';
import { VectorStore } from '../rag/vector-store';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = { code, message, ...(typeof details === 'undefined' ? {} : { details }) };
    return error;
}

function resolveModel(model: unknown): { id: string; name: 'text2vec-base-chinese' } | null {
    if (typeof model === 'undefined') return { id: DEFAULT_EMBEDDING_MODEL_ID, name: 'text2vec-base-chinese' };
    if (model === 'text2vec-base-chinese') return { id: DEFAULT_EMBEDDING_MODEL_ID, name: 'text2vec-base-chinese' };
    return null;
}

/**
 * Why: Preserve the Electron `embedding:*` IPC surface (encode + index) while moving execution into the Theia backend.
 * Failure semantics: MUST throw `ipcError`-shaped errors so `WritenowBackendService` can map them to `IpcResponse`.
 */
@injectable()
export class EmbeddingRpcService {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(EmbeddingServiceToken) private readonly embeddingService: EmbeddingServiceShape,
        @inject(VectorStore) private readonly vectorStore: VectorStore,
    ) {}

    async encode(request: EmbeddingEncodeRequest): Promise<EmbeddingEncodeResponse> {
        const texts = request?.texts;
        if (!Array.isArray(texts) || texts.length === 0) throw createIpcError('INVALID_ARGUMENT', 'texts must be a non-empty array');
        for (const text of texts) {
            if (typeof text !== 'string') throw createIpcError('INVALID_ARGUMENT', 'texts must be string[]');
        }

        const modelInfo = resolveModel(request?.model);
        if (!modelInfo) throw createIpcError('INVALID_ARGUMENT', 'Unsupported model', { model: request?.model });

        const result = await this.embeddingService.encode(texts);
        return { model: modelInfo.name, dimension: result.dimension, vectors: result.vectors };
    }

    async index(request: EmbeddingIndexRequest): Promise<EmbeddingIndexResponse> {
        const namespace = request?.namespace;
        if (namespace !== 'articles') throw createIpcError('INVALID_ARGUMENT', 'Unsupported namespace', { namespace });

        const modelInfo = resolveModel(request?.model);
        if (!modelInfo) throw createIpcError('INVALID_ARGUMENT', 'Unsupported model', { model: request?.model });

        const items = request?.items;
        if (!Array.isArray(items) || items.length === 0) throw createIpcError('INVALID_ARGUMENT', 'items must be a non-empty array');

        const normalized = items.map((item) => ({
            id: typeof item?.id === 'string' ? item.id : '',
            text: typeof item?.text === 'string' ? item.text : '',
        }));
        for (const item of normalized) {
            if (!item.id) throw createIpcError('INVALID_ARGUMENT', 'item.id is required');
            if (!item.text) throw createIpcError('INVALID_ARGUMENT', 'item.text is required');
        }

        let dimension: number | null = null;
        let indexedCount = 0;

        const batchSize = 32;
        for (let i = 0; i < normalized.length; i += batchSize) {
            const batch = normalized.slice(i, i + batchSize);
            const texts = batch.map((b) => b.text);
            const ids = batch.map((b) => b.id);

            const encoded = await this.embeddingService.encode(texts);
            dimension = encoded.dimension;
            this.vectorStore.ensureReady(dimension);

            this.vectorStore.upsertArticleEmbeddings(
                ids.map((id, idx) => ({
                    id,
                    embedding: encoded.vectors[idx],
                })),
            );

            indexedCount += batch.length;
        }

        this.logger.debug?.(`[embedding] indexed: ${indexedCount} (${modelInfo.name})`);
        return { indexedCount, dimension: dimension ?? 0 };
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('embedding:encode', async (_evt, payload) => {
            return this.encode(payload as EmbeddingEncodeRequest);
        });

        registry.handleInvoke('embedding:index', async (_evt, payload) => {
            return this.index(payload as EmbeddingIndexRequest);
        });
    }
}
