import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { getLoadablePath, load as loadSqliteVec } from 'sqlite-vec';

import type { IpcErrorCode } from '../../common/ipc-generated';
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

function getStoredJsonSetting(db: ReturnType<WritenowSqliteDb['ensureReady']>['db'], key: string): unknown {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: unknown } | undefined;
    if (!row || typeof row.value !== 'string') return null;
    try {
        return JSON.parse(row.value) as unknown;
    } catch {
        return row.value;
    }
}

function setStoredJsonSetting(db: ReturnType<WritenowSqliteDb['ensureReady']>['db'], key: string, value: unknown): void {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
        key,
        JSON.stringify(value),
    );
}

function stringifyVector(vector: readonly number[]): string {
    if (!Array.isArray(vector)) throw new Error('vector must be an array');
    return `[${vector.map((v) => Number(v)).join(',')}]`;
}

export type VectorStoreChunkEmbedding = Readonly<{ chunkId: string; embedding: readonly number[] }>;
export type VectorStoreArticleEmbedding = Readonly<{ id: string; embedding: readonly number[] }>;
export type VectorStoreEntityEmbedding = Readonly<{ entityId: string; entityType: string; embedding: readonly number[] }>;

export type QuerySimilarOptions = Readonly<{
    topK?: number;
    offset?: number;
    maxDistance?: number | null;
}>;

/**
 * Why: RAG semantic recall uses sqlite-vec vec0 virtual tables for vector similarity searches while keeping
 * everything in the same SQLite file as the rest of WriteNow state (no external vector DB).
 */
@injectable()
export class VectorStore {
    private loaded = false;

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    private get db() {
        return this.sqliteDb.db;
    }

    ensureReady(dimension: number): void {
        const db = this.db;
        if (typeof dimension !== 'number' || !Number.isFinite(dimension) || dimension <= 0) {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid embedding dimension', { dimension });
        }

        if (!this.loaded) {
            try {
                loadSqliteVec(db);
                this.loaded = true;
            } catch (error) {
                const loadablePath = (() => {
                    try {
                        return getLoadablePath();
                    } catch {
                        return null;
                    }
                })();
                this.logger.error(`[vec] failed to load sqlite-vec: ${error instanceof Error ? error.message : String(error)}`);
                throw createIpcError('DB_ERROR', 'Failed to load sqlite-vec extension', {
                    message: error instanceof Error ? error.message : String(error),
                    loadablePath,
                });
            }
        }

        const storedDimension = getStoredJsonSetting(db, 'embedding.dimension');
        if (storedDimension !== null && storedDimension !== dimension) {
            throw createIpcError('CONFLICT', 'Embedding dimension mismatch', {
                expected: storedDimension,
                received: dimension,
                recovery: 'Rebuild vector index: delete vec tables and re-run embedding:index for all items.',
            });
        }

        try {
            db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS articles_vec USING vec0(
                id TEXT PRIMARY KEY,
                embedding FLOAT[${dimension}]
            )`);
        } catch (error) {
            this.logger.error(`[vec] failed to create articles_vec: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to initialize vector schema', { message: error instanceof Error ? error.message : String(error) });
        }

        if (storedDimension === null) setStoredJsonSetting(db, 'embedding.dimension', dimension);
    }

    ensureChunkIndex(dimension: number): void {
        this.ensureReady(dimension);
        const db = this.db;
        try {
            db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS article_chunks_vec USING vec0(
                chunk_id TEXT PRIMARY KEY,
                article_id TEXT,
                embedding FLOAT[${dimension}]
            )`);
        } catch (error) {
            this.logger.error(`[vec] failed to create article_chunks_vec: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to initialize chunk vector schema', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    ensureEntityIndex(dimension: number): void {
        this.ensureReady(dimension);
        const db = this.db;
        try {
            db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS entity_vec USING vec0(
                entity_id TEXT PRIMARY KEY,
                entity_type TEXT,
                embedding FLOAT[${dimension}]
            )`);
        } catch (error) {
            this.logger.error(`[vec] failed to create entity_vec: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to initialize entity vector schema', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    upsertArticleEmbeddings(items: readonly VectorStoreArticleEmbedding[]): void {
        const db = this.db;
        if (!Array.isArray(items)) throw createIpcError('INVALID_ARGUMENT', 'items must be an array');

        const tx = db.transaction(() => {
            const del = db.prepare('DELETE FROM articles_vec WHERE id = ?');
            const ins = db.prepare('INSERT INTO articles_vec(id, embedding) VALUES (?, vec_f32(?))');

            for (const item of items) {
                const id = typeof item?.id === 'string' ? item.id : '';
                if (!id) throw createIpcError('INVALID_ARGUMENT', 'item.id is required');
                del.run(id);
                ins.run(id, stringifyVector(item.embedding));
            }
        });

        tx();
    }

    replaceChunkEmbeddings(articleId: string, chunks: readonly VectorStoreChunkEmbedding[]): void {
        const db = this.db;
        const article_id = typeof articleId === 'string' ? articleId : '';
        if (!article_id) throw createIpcError('INVALID_ARGUMENT', 'articleId is required');
        if (!Array.isArray(chunks)) throw createIpcError('INVALID_ARGUMENT', 'chunks must be an array');

        const tx = db.transaction(() => {
            db.prepare('DELETE FROM article_chunks_vec WHERE article_id = ?').run(article_id);
            const ins = db.prepare('INSERT INTO article_chunks_vec(chunk_id, article_id, embedding) VALUES (?, ?, vec_f32(?))');
            for (const chunk of chunks) {
                const chunkId = typeof chunk?.chunkId === 'string' ? chunk.chunkId : '';
                if (!chunkId) throw createIpcError('INVALID_ARGUMENT', 'chunkId is required');
                ins.run(chunkId, article_id, stringifyVector(chunk.embedding));
            }
        });

        tx();
    }

    upsertEntityEmbeddings(items: readonly VectorStoreEntityEmbedding[]): void {
        const db = this.db;
        if (!Array.isArray(items)) throw createIpcError('INVALID_ARGUMENT', 'items must be an array');

        const tx = db.transaction(() => {
            const del = db.prepare('DELETE FROM entity_vec WHERE entity_id = ?');
            const ins = db.prepare('INSERT INTO entity_vec(entity_id, entity_type, embedding) VALUES (?, ?, vec_f32(?))');
            for (const item of items) {
                const id = typeof item?.entityId === 'string' ? item.entityId : '';
                const type = typeof item?.entityType === 'string' ? item.entityType : '';
                if (!id) throw createIpcError('INVALID_ARGUMENT', 'entityId is required');
                if (!type) throw createIpcError('INVALID_ARGUMENT', 'entityType is required');
                del.run(id);
                ins.run(id, type, stringifyVector(item.embedding));
            }
        });

        tx();
    }

    querySimilarArticles(queryEmbedding: readonly number[], options: QuerySimilarOptions = {}): Array<{ id: string; distance: number }> {
        const db = this.db;
        const topK = typeof options.topK === 'number' ? Math.max(1, Math.min(50, options.topK)) : 20;
        const offset = typeof options.offset === 'number' && options.offset >= 0 ? options.offset : 0;
        const maxDistance =
            typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0 ? options.maxDistance : null;

        const vector = stringifyVector(queryEmbedding);
        const k = Math.min(200, offset + topK);

        const rows =
            maxDistance === null
                ? (db
                      .prepare('SELECT id, distance FROM articles_vec WHERE embedding MATCH vec_f32(?) AND k = ? ORDER BY distance')
                      .all(vector, k) as Array<{ id?: unknown; distance?: unknown }>)
                : (db
                      .prepare(
                          'SELECT id, distance FROM articles_vec WHERE embedding MATCH vec_f32(?) AND k = ? AND distance <= ? ORDER BY distance',
                      )
                      .all(vector, k, maxDistance) as Array<{ id?: unknown; distance?: unknown }>);

        return rows
            .map((row) => ({
                id: typeof row?.id === 'string' ? row.id : '',
                distance: typeof row?.distance === 'number' ? row.distance : Number(row?.distance ?? 0),
            }))
            .filter((row) => row.id)
            .slice(offset, offset + topK);
    }

    querySimilarChunks(
        queryEmbedding: readonly number[],
        options: QuerySimilarOptions & { articleId?: string | null } = {},
    ): Array<{ chunkId: string; articleId: string; distance: number }> {
        const db = this.db;
        const topK = typeof options.topK === 'number' ? Math.max(1, Math.min(50, options.topK)) : 20;
        const offset = typeof options.offset === 'number' && options.offset >= 0 ? options.offset : 0;
        const maxDistance =
            typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0 ? options.maxDistance : null;
        const articleId = typeof options.articleId === 'string' ? options.articleId : null;

        const vector = stringifyVector(queryEmbedding);
        const k = Math.min(200, offset + topK);

        const clauses = ['embedding MATCH vec_f32(?)', 'k = ?'];
        const params: unknown[] = [vector, k];
        if (articleId) {
            clauses.push('article_id = ?');
            params.push(articleId);
        }
        if (maxDistance !== null) {
            clauses.push('distance <= ?');
            params.push(maxDistance);
        }

        const rows = db
            .prepare(`SELECT chunk_id, article_id, distance FROM article_chunks_vec WHERE ${clauses.join(' AND ')} ORDER BY distance`)
            .all(...params) as Array<{ chunk_id?: unknown; article_id?: unknown; distance?: unknown }>;

        return rows
            .map((row) => ({
                chunkId: typeof row?.chunk_id === 'string' ? row.chunk_id : '',
                articleId: typeof row?.article_id === 'string' ? row.article_id : '',
                distance: typeof row?.distance === 'number' ? row.distance : Number(row?.distance ?? 0),
            }))
            .filter((row) => row.chunkId && row.articleId)
            .slice(offset, offset + topK);
    }

    querySimilarEntities(
        queryEmbedding: readonly number[],
        options: Readonly<{ topK?: number; maxDistance?: number | null; entityType?: string | null }> = {},
    ): Array<{ entityId: string; entityType: string; distance: number }> {
        const db = this.db;
        const topK = typeof options.topK === 'number' ? Math.max(1, Math.min(20, options.topK)) : 10;
        const maxDistance =
            typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0 ? options.maxDistance : null;
        const entityType = typeof options.entityType === 'string' ? options.entityType : null;

        const vector = stringifyVector(queryEmbedding);
        const k = Math.min(100, topK);

        const clauses = ['embedding MATCH vec_f32(?)', 'k = ?'];
        const params: unknown[] = [vector, k];
        if (entityType) {
            clauses.push('entity_type = ?');
            params.push(entityType);
        }
        if (maxDistance !== null) {
            clauses.push('distance <= ?');
            params.push(maxDistance);
        }

        const rows = db
            .prepare(`SELECT entity_id, entity_type, distance FROM entity_vec WHERE ${clauses.join(' AND ')} ORDER BY distance`)
            .all(...params) as Array<{ entity_id?: unknown; entity_type?: unknown; distance?: unknown }>;

        return rows
            .map((row) => ({
                entityId: typeof row?.entity_id === 'string' ? row.entity_id : '',
                entityType: typeof row?.entity_type === 'string' ? row.entity_type : '',
                distance: typeof row?.distance === 'number' ? row.distance : Number(row?.distance ?? 0),
            }))
            .filter((row) => row.entityId && row.entityType);
    }
}

