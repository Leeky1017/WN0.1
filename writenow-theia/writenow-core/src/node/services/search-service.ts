import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    IpcErrorCode,
    SearchFulltextRequest,
    SearchFulltextResponse,
    SearchSemanticRequest,
    SearchSemanticResponse,
} from '../../common/ipc-generated';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

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
        // Why: Task 011 provides the embedding service; until then we surface a stable "not ready" error.
        throw createIpcError('MODEL_NOT_READY', 'Embedding service is not ready');
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
