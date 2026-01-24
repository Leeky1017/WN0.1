import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    IpcErrorCode,
    SearchFulltextRequest,
    SearchFulltextResponse,
    SearchSemanticRequest,
    SearchSemanticResponse,
} from '../../common/ipc-generated';
import { EmbeddingService as EmbeddingServiceToken } from '../../common/writenow-protocol';
import type { EmbeddingService as EmbeddingServiceShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { VectorStore } from '../rag/vector-store';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = { code, message, ...(typeof details === 'undefined' ? {} : { details }) };
    return error;
}

function parseProjectId(raw: unknown): string | null {
    if (typeof raw === 'undefined') return null;
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
}

function assertValidProjectId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    if (!('projectId' in payload)) return null;
    const value = parseProjectId((payload as { projectId?: unknown }).projectId);
    if (!value) throw createIpcError('INVALID_ARGUMENT', 'Invalid projectId', { projectId: (payload as { projectId?: unknown }).projectId });
    return value;
}

function parseLimit(input: unknown): number | null {
    if (typeof input === 'undefined') return 20;
    const parsed = Number.parseInt(String(input), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 50);
}

function parseOffsetCursor(cursor: unknown): number | null {
    if (typeof cursor === 'undefined' || cursor === null || cursor === '') return 0;
    const parsed = Number.parseInt(String(cursor), 10);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
}

function isFtsSyntaxError(error: unknown): boolean {
    const message = error && typeof error === 'object' ? String((error as { message?: unknown }).message || '') : '';
    return message.toLowerCase().includes('fts5') && message.toLowerCase().includes('syntax');
}

/**
 * Why: Search endpoints are used by the editor UI for quick keyword recall and (later) semantic recall.
 * Failure semantics: MUST return stable `IpcErrorCode` via thrown `{ ipcError: { code, message, details? } }`.
 */
@injectable()
export class SearchService {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
        @inject(EmbeddingServiceToken) private readonly embeddingService: EmbeddingServiceShape,
        @inject(VectorStore) private readonly vectorStore: VectorStore,
    ) {}

    async fulltext(request: SearchFulltextRequest): Promise<SearchFulltextResponse> {
        const db = this.sqliteDb.db;
        const query = typeof request?.query === 'string' ? request.query.trim() : '';
        if (!query) throw createIpcError('INVALID_ARGUMENT', 'Query is required');

        const projectId = assertValidProjectId(request);

        const limit = parseLimit(request?.limit);
        if (limit === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid limit', { limit: request?.limit });

        const offset = parseOffsetCursor(request?.cursor);
        if (offset === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: request?.cursor });

        try {
            const totalRow = db
                .prepare(
                    `SELECT COUNT(*) AS total
                     FROM articles_fts
                     JOIN articles a ON a.rowid = articles_fts.rowid
                     WHERE articles_fts MATCH ?
                       ${projectId ? 'AND a.project_id = ?' : ''}`,
                )
                .get(...(projectId ? [query, projectId] : [query])) as { total?: unknown } | undefined;

            const total = typeof totalRow?.total === 'number' ? totalRow.total : Number(totalRow?.total ?? 0);

            const rows = db
                .prepare(
                    `SELECT a.id AS id,
                            a.title AS title,
                            snippet(articles_fts, 1, char(1), char(2), '…', 12) AS snippet,
                            bm25(articles_fts) AS bm25
                     FROM articles_fts
                     JOIN articles a ON a.rowid = articles_fts.rowid
                     WHERE articles_fts MATCH ?
                       ${projectId ? 'AND a.project_id = ?' : ''}
                     ORDER BY bm25(articles_fts)
                     LIMIT ? OFFSET ?`,
                )
                .all(...(projectId ? [query, projectId, limit, offset] : [query, limit, offset])) as Array<{
                id?: unknown;
                title?: unknown;
                snippet?: unknown;
                bm25?: unknown;
            }>;

            const items = rows
                .map((row) => {
                    const id = typeof row?.id === 'string' ? row.id : '';
                    const title = typeof row?.title === 'string' ? row.title : '';
                    const snippet = typeof row?.snippet === 'string' ? row.snippet : '';
                    const bm25 = typeof row?.bm25 === 'number' ? row.bm25 : Number(row?.bm25 ?? 0);
                    return {
                        id,
                        title,
                        snippet,
                        score: Number.isFinite(bm25) ? -bm25 : undefined,
                    };
                })
                .filter((hit) => hit.id && hit.title);

            const nextOffset = offset + items.length;
            const nextCursor = nextOffset < total ? String(nextOffset) : undefined;

            return {
                items,
                page: {
                    limit,
                    cursor: String(offset),
                    nextCursor,
                    total,
                },
            };
        } catch (error) {
            if (isFtsSyntaxError(error)) throw createIpcError('INVALID_ARGUMENT', 'Invalid fulltext query', { query });
            this.logger.error(`[search] fulltext query failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Fulltext search failed', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    async semantic(request: SearchSemanticRequest): Promise<SearchSemanticResponse> {
        const db = this.sqliteDb.db;
        const query = typeof request?.query === 'string' ? request.query.trim() : '';
        if (!query) throw createIpcError('INVALID_ARGUMENT', 'Query is required');

        const projectId = assertValidProjectId(request);

        const limit = parseLimit(request?.limit);
        if (limit === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid limit', { limit: request?.limit });

        const offset = parseOffsetCursor(request?.cursor);
        if (offset === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: request?.cursor });

        const thresholdRaw = (request as { threshold?: unknown })?.threshold;
        const threshold =
            typeof thresholdRaw === 'undefined' || thresholdRaw === null || thresholdRaw === ''
                ? null
                : Number.parseFloat(String(thresholdRaw));
        if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)) {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid threshold', { threshold: thresholdRaw });
        }

        const maxDistance = threshold && threshold > 0 ? 1 / threshold - 1 : null;

        try {
            const encoded = await this.embeddingService.encode([query]);
            this.vectorStore.ensureReady(encoded.dimension);

            const batchSize = 50;
            const items: Array<{ id: string; title: string; snippet: string; score: number }> = [];
            let scanOffset = offset;

            while (items.length < limit) {
                const hits = this.vectorStore.querySimilarArticles(encoded.vectors[0], { topK: batchSize, offset: scanOffset, maxDistance });
                if (hits.length === 0) break;
                scanOffset += hits.length;

                const ids = hits.map((hit) => hit.id);
                const articleById = new Map<string, { id: string; title: string; content: string }>();
                if (ids.length > 0) {
                    const placeholders = ids.map(() => '?').join(',');
                    const rows = projectId
                        ? (db
                              .prepare(`SELECT id, title, content FROM articles WHERE id IN (${placeholders}) AND project_id = ?`)
                              .all(...ids, projectId) as Array<{ id?: unknown; title?: unknown; content?: unknown }>)
                        : (db
                              .prepare(`SELECT id, title, content FROM articles WHERE id IN (${placeholders})`)
                              .all(...ids) as Array<{ id?: unknown; title?: unknown; content?: unknown }>);

                    for (const row of rows) {
                        if (!row || typeof row.id !== 'string') continue;
                        articleById.set(row.id, {
                            id: row.id,
                            title: typeof row.title === 'string' ? row.title : row.id,
                            content: typeof row.content === 'string' ? row.content : '',
                        });
                    }
                }

                for (const hit of hits) {
                    const row = articleById.get(hit.id);
                    if (!row) continue;
                    const snippetBase = row.content.replace(/\\s+/g, ' ').trim();
                    const snippet = snippetBase.length > 160 ? `${snippetBase.slice(0, 160)}…` : snippetBase;
                    const distance = hit.distance;
                    const score = Number.isFinite(distance) ? 1 / (1 + Math.max(0, distance)) : 0;
                    items.push({ id: hit.id, title: row.title || hit.id, snippet, score });
                    if (items.length >= limit) break;
                }

                if (hits.length < batchSize) break;
            }

            const nextCursor = items.length === limit ? String(scanOffset) : undefined;

            return {
                items,
                page: {
                    limit,
                    cursor: String(offset),
                    nextCursor,
                },
            };
        } catch (error) {
            if (error && typeof error === 'object' && 'ipcError' in error) throw error;
            this.logger.error(`[search] semantic query failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Semantic search failed', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('search:fulltext', async (_evt, payload) => {
            return this.fulltext(payload as SearchFulltextRequest);
        });

        registry.handleInvoke('search:semantic', async (_evt, payload) => {
            return this.semantic(payload as SearchSemanticRequest);
        });
    }
}
