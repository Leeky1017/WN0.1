import { createHash } from 'node:crypto';

import type { ILogger } from '@theia/core/lib/common/logger';

import { chunkMarkdownToParagraphs } from './chunking';
import { parseEntityCard } from './entities';
import type { VectorStore } from './vector-store';
import type { EmbeddingService } from '../../common/writenow-protocol';
import type { SqliteDatabase } from '../database/init';

function toIsoNow(): string {
    return new Date().toISOString();
}

function createChunkId(articleId: string, idx: number, content: string): string {
    const hash = createHash('sha256')
        .update(String(articleId))
        .update('\n')
        .update(String(idx))
        .update('\n')
        .update(String(content))
        .digest('hex')
        .slice(0, 24);
    return `${articleId}::${hash}`;
}

function averageVectors(vectors: readonly number[][]): number[] | null {
    if (!Array.isArray(vectors) || vectors.length === 0) return null;
    const dim = Array.isArray(vectors[0]) ? vectors[0].length : 0;
    if (!dim) return null;

    const acc = new Array<number>(dim).fill(0);
    for (const vec of vectors) {
        if (!Array.isArray(vec) || vec.length !== dim) return null;
        for (let i = 0; i < dim; i += 1) acc[i] += Number(vec[i]) || 0;
    }
    for (let i = 0; i < dim; i += 1) acc[i] /= vectors.length;
    return acc;
}

function tableExists(db: SqliteDatabase, name: string): boolean {
    const row = db
        .prepare("SELECT 1 AS ok FROM sqlite_master WHERE (type='table' OR type='virtual_table') AND name = ?")
        .get(name) as { ok?: unknown } | undefined;
    return Boolean(row?.ok);
}

export type RagIndexerOptions = Readonly<{
    db: SqliteDatabase;
    logger?: ILogger;
    embeddingService?: EmbeddingService | null;
    vectorStore?: VectorStore | null;
}>;

/**
 * Why: Keep a single, debounced indexing loop (like Electron) so rapid successive saves do not thrash the DB.
 * Failure semantics: indexing is best-effort and MUST never crash the backend; failures are logged and can be
 * retried by re-saving the document or re-queueing the article id.
 */
export class RagIndexer {
    private readonly db: SqliteDatabase;
    private readonly embeddingService: EmbeddingService | null;
    private readonly vectorStore: VectorStore | null;
    private readonly logger: ILogger | null;

    private readonly queue = new Map<string, true>();
    private processing: Promise<void> | null = null;

    constructor(options: RagIndexerOptions) {
        this.db = options.db;
        this.embeddingService = options.embeddingService ?? null;
        this.vectorStore = options.vectorStore ?? null;
        this.logger = options.logger ?? null;
    }

    enqueueArticle(articleId: string): void {
        const id = typeof articleId === 'string' ? articleId : '';
        if (!id) return;
        this.queue.set(id, true);
        this.kick();
    }

    async flush(): Promise<void> {
        await this.processing;
    }

    private kick(): void {
        if (this.processing) return;
        this.processing = this.runLoop().finally(() => {
            this.processing = null;
            if (this.queue.size > 0) this.kick();
        });
    }

    private async runLoop(): Promise<void> {
        while (this.queue.size > 0) {
            const next = this.queue.keys().next().value as string | undefined;
            if (!next) break;
            this.queue.delete(next);
            try {
                await this.indexArticle(next);
            } catch (error) {
                this.logger?.warn?.(`[rag-indexer] index failed: ${next} (${error instanceof Error ? error.message : String(error)})`);
            }
        }
    }

    async handleDeletedArticle(articleId: string): Promise<void> {
        const id = typeof articleId === 'string' ? articleId : '';
        if (!id) return;
        const db = this.db;

        try {
            if (tableExists(db, 'article_chunks')) {
                db.prepare('DELETE FROM article_chunks WHERE article_id = ?').run(id);
            }
        } catch (error) {
            this.logger?.warn?.(`[rag-indexer] failed to delete chunks: ${id} (${error instanceof Error ? error.message : String(error)})`);
        }

        try {
            if (tableExists(db, 'articles_vec')) db.prepare('DELETE FROM articles_vec WHERE id = ?').run(id);
        } catch {
            // ignore (vec table may not exist yet)
        }

        try {
            if (tableExists(db, 'article_chunks_vec')) db.prepare('DELETE FROM article_chunks_vec WHERE article_id = ?').run(id);
        } catch {
            // ignore
        }

        try {
            const entities = tableExists(db, 'entity_cards')
                ? (db.prepare('SELECT id FROM entity_cards WHERE source_article_id = ?').all(id) as Array<{ id?: unknown }>)
                : [];
            if (tableExists(db, 'entity_cards')) db.prepare('DELETE FROM entity_cards WHERE source_article_id = ?').run(id);
            if (tableExists(db, 'entity_vec')) {
                const del = db.prepare('DELETE FROM entity_vec WHERE entity_id = ?');
                for (const row of entities) {
                    const entityId = typeof row?.id === 'string' ? row.id : '';
                    if (entityId) del.run(entityId);
                }
            }
        } catch (error) {
            this.logger?.warn?.(`[rag-indexer] failed to delete entity cards: ${id} (${error instanceof Error ? error.message : String(error)})`);
        }
    }

    private async indexArticle(articleId: string): Promise<void> {
        const db = this.db;
        const row = db.prepare('SELECT id, content FROM articles WHERE id = ?').get(articleId) as { content?: unknown } | undefined;
        if (!row || typeof row.content !== 'string') {
            await this.handleDeletedArticle(articleId);
            return;
        }

        const content = row.content;
        const now = toIsoNow();

        // 1) Chunk table (always available)
        const paragraphs = chunkMarkdownToParagraphs(content);
        const chunks = paragraphs.map((text, idx) => ({
            id: createChunkId(articleId, idx, text),
            article_id: articleId,
            idx,
            content: text,
            created_at: now,
            updated_at: now,
        }));

        const txChunks = db.transaction(() => {
            db.prepare('DELETE FROM article_chunks WHERE article_id = ?').run(articleId);
            const insert = db.prepare(
                'INSERT INTO article_chunks (id, article_id, idx, content, created_at, updated_at) VALUES (@id, @article_id, @idx, @content, @created_at, @updated_at)',
            );
            for (const chunk of chunks) insert.run(chunk);
        });
        txChunks();

        // 2) Optional: embeddings (Task 011 dependency).
        if (chunks.length > 0 && this.embeddingService && this.vectorStore) {
            const vectors: number[][] = [];
            const batchSize = 24;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const encoded = await this.embeddingService.encode(batch.map((c) => c.content));
                this.vectorStore.ensureChunkIndex(encoded.dimension);
                vectors.push(...encoded.vectors);
            }

            this.vectorStore.replaceChunkEmbeddings(
                articleId,
                chunks.map((chunk, idx) => ({ chunkId: chunk.id, embedding: vectors[idx] })),
            );

            const articleVector = averageVectors(vectors);
            if (articleVector) {
                this.vectorStore.ensureReady(articleVector.length);
                this.vectorStore.upsertArticleEmbeddings([{ id: articleId, embedding: articleVector }]);
            }
        }

        // 3) Entity cards (front-matter derived; embeddings are optional).
        const card = parseEntityCard(articleId, content);
        if (card) {
            const existing = db.prepare('SELECT id FROM entity_cards WHERE source_article_id = ?').all(articleId) as Array<{ id?: unknown }>;
            const existingIds = existing.map((r) => (r && typeof r.id === 'string' ? r.id : null)).filter(Boolean) as string[];

            const upsert = db.prepare(
                `INSERT INTO entity_cards (id, type, name, aliases, content, source_article_id, created_at, updated_at)
                 VALUES (@id, @type, @name, @aliases, @content, @source_article_id, @created_at, @updated_at)
                 ON CONFLICT(id) DO UPDATE SET
                   type=excluded.type,
                   name=excluded.name,
                   aliases=excluded.aliases,
                   content=excluded.content,
                   source_article_id=excluded.source_article_id,
                   updated_at=excluded.updated_at`,
            );

            upsert.run({
                id: card.id,
                type: card.type,
                name: card.name,
                aliases: JSON.stringify(card.aliases),
                content: card.content,
                source_article_id: card.sourceArticleId,
                created_at: now,
                updated_at: now,
            });

            for (const oldId of existingIds) {
                if (oldId === card.id) continue;
                db.prepare('DELETE FROM entity_cards WHERE id = ?').run(oldId);
                try {
                    if (tableExists(db, 'entity_vec')) db.prepare('DELETE FROM entity_vec WHERE entity_id = ?').run(oldId);
                } catch {
                    // ignore
                }
            }

            if (this.embeddingService && this.vectorStore) {
                const encoded = await this.embeddingService.encode([card.content]);
                this.vectorStore.ensureEntityIndex(encoded.dimension);
                this.vectorStore.upsertEntityEmbeddings([
                    { entityId: card.id, entityType: card.type, embedding: encoded.vectors[0] },
                ]);
            }
        } else {
            const existing = db.prepare('SELECT id FROM entity_cards WHERE source_article_id = ?').all(articleId) as Array<{ id?: unknown }>;
            const existingIds = existing.map((r) => (r && typeof r.id === 'string' ? r.id : null)).filter(Boolean) as string[];
            if (existingIds.length > 0) {
                db.prepare('DELETE FROM entity_cards WHERE source_article_id = ?').run(articleId);
                try {
                    if (tableExists(db, 'entity_vec')) {
                        const del = db.prepare('DELETE FROM entity_vec WHERE entity_id = ?');
                        for (const oldId of existingIds) del.run(oldId);
                    }
                } catch {
                    // ignore
                }
            }
        }

        this.logger?.debug?.(`[rag-indexer] indexed: ${articleId} (chunks: ${chunks.length}, entityCard: ${Boolean(card)})`);
    }
}
