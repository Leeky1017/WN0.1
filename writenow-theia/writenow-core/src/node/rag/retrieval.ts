import type { ILogger } from '@theia/core/lib/common/logger';

import type { IpcErrorCode, RagBudget, RagEntityCard, RagPassage, RagRetrieveResponse } from '../../common/ipc-generated';
import type { EmbeddingService } from '../../common/writenow-protocol';
import type { SqliteDatabase } from '../database/init';
import { containsEntity, extractExplicitMentions } from './entities';
import type { VectorStore } from './vector-store';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = { code, message, ...(typeof details === 'undefined' ? {} : { details }) };
    return error;
}

function parseCursor(cursor: unknown): number | null {
    if (typeof cursor === 'undefined' || cursor === null || cursor === '') return 0;
    const parsed = Number.parseInt(String(cursor), 10);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
}

function distanceToScore(distance: unknown): number {
    const numeric = typeof distance === 'number' ? distance : Number(distance ?? NaN);
    if (!Number.isFinite(numeric)) return 0;
    return 1 / (1 + Math.max(0, numeric));
}

function parseAliases(raw: unknown): string[] {
    if (typeof raw !== 'string' || !raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.map((value) => String(value).trim()).filter(Boolean);
    } catch {
        return [];
    }
}

function trimToBudget<TItem>(items: readonly TItem[], getText: (item: TItem) => string, maxChars: number): { kept: TItem[]; used: number } {
    const kept: TItem[] = [];
    let used = 0;
    for (const item of items) {
        const text = getText(item);
        const next = used + text.length;
        if (kept.length > 0 && next > maxChars) break;
        kept.push(item);
        used = next;
    }
    return { kept, used };
}

export type RetrieveRagOptions = Readonly<{
    db: SqliteDatabase | null;
    logger?: ILogger | null;
    embeddingService?: EmbeddingService | null;
    vectorStore?: VectorStore | null;
    queryText: string;
    budget?: RagBudget;
}>;

/**
 * Why: Provide a single "context retrieval" pipeline that merges entity cards and passage recall,
 * using keyword recall (FTS) as the always-available baseline and semantic recall (sqlite-vec) when
 * the embedding service is available (Task 011).
 */
export async function retrieveRagContext(options: RetrieveRagOptions): Promise<RagRetrieveResponse> {
    const db = options.db;
    const logger = options.logger ?? null;
    const embeddingService = options.embeddingService ?? null;
    const vectorStore = options.vectorStore ?? null;

    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready');

    const queryText = typeof options.queryText === 'string' ? options.queryText.trim() : '';
    if (!queryText) throw createIpcError('INVALID_ARGUMENT', 'queryText is required');

    const budget = options.budget && typeof options.budget === 'object' ? options.budget : {};
    const maxChars = typeof budget.maxChars === 'number' ? Math.max(500, Math.min(20_000, budget.maxChars)) : 4000;
    const maxChunks = typeof budget.maxChunks === 'number' ? Math.max(1, Math.min(20, budget.maxChunks)) : 8;
    const maxCharacters = typeof budget.maxCharacters === 'number' ? Math.max(0, Math.min(20, budget.maxCharacters)) : 5;
    const maxSettings = typeof budget.maxSettings === 'number' ? Math.max(0, Math.min(20, budget.maxSettings)) : 5;

    const cursor = parseCursor(budget.cursor);
    if (cursor === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: budget.cursor });

    const thresholdRaw = (budget as { threshold?: unknown }).threshold;
    const threshold =
        typeof thresholdRaw === 'undefined' ||
        thresholdRaw === null ||
        (typeof thresholdRaw === 'string' && thresholdRaw.trim() === '')
            ? null
            : Number.parseFloat(String(thresholdRaw));
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)) {
        throw createIpcError('INVALID_ARGUMENT', 'Invalid threshold', { threshold: thresholdRaw });
    }
    const maxDistance = threshold && threshold > 0 ? 1 / threshold - 1 : null;

    // --- Entities (exact match first, semantic fallback) ---
    const entityRows = db
        .prepare('SELECT id, type, name, aliases, content, source_article_id AS sourceArticleId, updated_at AS updatedAt FROM entity_cards')
        .all() as Array<{
        id?: unknown;
        type?: unknown;
        name?: unknown;
        aliases?: unknown;
        content?: unknown;
        sourceArticleId?: unknown;
        updatedAt?: unknown;
    }>;

    const entities = entityRows
        .map((row) => ({
            id: typeof row?.id === 'string' ? row.id : '',
            type: typeof row?.type === 'string' ? row.type : '',
            name: typeof row?.name === 'string' ? row.name : '',
            aliases: parseAliases(row?.aliases),
            content: typeof row?.content === 'string' ? row.content : '',
            sourceArticleId: typeof row?.sourceArticleId === 'string' ? row.sourceArticleId : null,
            updatedAt: typeof row?.updatedAt === 'string' ? row.updatedAt : null,
        }))
        .filter((entity) => entity.id && entity.type && entity.name && entity.content) as Array<{
        id: string;
        type: string;
        name: string;
        aliases: string[];
        content: string;
        sourceArticleId: string | null;
        updatedAt: string | null;
    }>;

    const entitySourceArticleIdSet = new Set(entities.map((e) => e.sourceArticleId).filter(Boolean) as string[]);

    const explicitMentions = extractExplicitMentions(queryText);
    const explicitlyMatched = entities.filter((entity) => {
        if (explicitMentions.includes(entity.name)) return true;
        for (const alias of entity.aliases) {
            if (explicitMentions.includes(alias)) return true;
        }
        return false;
    });

    const textMatched = entities.filter((entity) => containsEntity(queryText, entity));
    const entityMatched = new Map<string, typeof entities[number]>();
    for (const entity of [...explicitlyMatched, ...textMatched]) entityMatched.set(entity.id, entity);

    let recalledEntities: Array<typeof entities[number] & { score?: number }> = Array.from(entityMatched.values());

    // Semantic entity fallback (optional)
    let queryEmbedding: number[] | null = null;
    let embeddingDimension: number | null = null;
    if (recalledEntities.length === 0 && embeddingService && vectorStore) {
        try {
            const encoded = await embeddingService.encode([queryText]);
            queryEmbedding = encoded.vectors[0];
            embeddingDimension = encoded.dimension;
            vectorStore.ensureEntityIndex(encoded.dimension);
            const similar = vectorStore.querySimilarEntities(queryEmbedding, { topK: 10, maxDistance });
            const byId = new Map(entities.map((entity) => [entity.id, entity]));
            recalledEntities = similar
                .map((hit) => {
                    const card = byId.get(hit.entityId);
                    if (!card) return null;
                    return { ...card, score: distanceToScore(hit.distance) };
                })
                .filter(Boolean) as Array<typeof entities[number] & { score?: number }>;
        } catch (error) {
            logger?.warn?.(`[rag] entity semantic recall skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const characters: RagEntityCard[] = recalledEntities
        .filter((entity) => entity.type === 'character')
        .slice(0, maxCharacters)
        .map((entity) => ({
            id: entity.id,
            type: 'character',
            name: entity.name,
            aliases: entity.aliases,
            content: entity.content,
            sourceArticleId: entity.sourceArticleId,
            updatedAt: entity.updatedAt,
            score: typeof entity.score === 'number' ? entity.score : 1,
        }));

    const settings: RagEntityCard[] = recalledEntities
        .filter((entity) => entity.type === 'setting')
        .slice(0, maxSettings)
        .map((entity) => ({
            id: entity.id,
            type: 'setting',
            name: entity.name,
            aliases: entity.aliases,
            content: entity.content,
            sourceArticleId: entity.sourceArticleId,
            updatedAt: entity.updatedAt,
            score: typeof entity.score === 'number' ? entity.score : 1,
        }));

    // --- Passages (semantic chunks + keyword recall) ---
    let semanticChunks: RagPassage[] = [];
    if (embeddingService && vectorStore) {
        try {
            if (!queryEmbedding || !embeddingDimension) {
                const encoded = await embeddingService.encode([queryText]);
                queryEmbedding = encoded.vectors[0];
                embeddingDimension = encoded.dimension;
            }

            vectorStore.ensureChunkIndex(embeddingDimension);
            const semanticChunkHits = vectorStore.querySimilarChunks(queryEmbedding, { topK: 20, offset: cursor, maxDistance });

            const chunkIds = semanticChunkHits.map((hit) => hit.chunkId);
            const chunkById = new Map<string, { id: string; articleId: string; idx: number; content: string; title: string }>();

            if (chunkIds.length > 0) {
                const placeholders = chunkIds.map(() => '?').join(',');
                const rows = db
                    .prepare(
                        `SELECT c.id, c.article_id AS articleId, c.idx, c.content, a.title
                         FROM article_chunks c
                         JOIN articles a ON a.id = c.article_id
                         WHERE c.id IN (${placeholders})`,
                    )
                    .all(...chunkIds) as Array<{ id?: unknown; articleId?: unknown; idx?: unknown; content?: unknown; title?: unknown }>;

                for (const row of rows) {
                    if (!row || typeof row.id !== 'string') continue;
                    chunkById.set(row.id, {
                        id: row.id,
                        articleId: typeof row.articleId === 'string' ? row.articleId : '',
                        idx: typeof row.idx === 'number' ? row.idx : Number(row.idx ?? 0),
                        content: typeof row.content === 'string' ? row.content : '',
                        title: typeof row.title === 'string' ? row.title : '',
                    });
                }
            }

            semanticChunks = semanticChunkHits
                .map((hit) => {
                    if (entitySourceArticleIdSet.has(hit.articleId)) return null;
                    const row = chunkById.get(hit.chunkId);
                    if (!row) return null;
                    return {
                        id: hit.chunkId,
                        articleId: hit.articleId,
                        title: row.title || hit.articleId,
                        idx: row.idx,
                        content: row.content,
                        score: distanceToScore(hit.distance),
                        source: {
                            articleId: hit.articleId,
                            chunkId: hit.chunkId,
                            idx: row.idx,
                        },
                    } satisfies RagPassage;
                })
                .filter(Boolean) as RagPassage[];
        } catch (error) {
            logger?.warn?.(`[rag] chunk semantic recall skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const runKeywordRecall = (ftsQuery: string): RagPassage[] => {
        const rows = db
            .prepare(
                `SELECT a.id AS id, a.title AS title, bm25(articles_fts) AS bm25
                 FROM articles_fts
                 JOIN articles a ON a.rowid = articles_fts.rowid
                 WHERE articles_fts MATCH ?
                 ORDER BY bm25(articles_fts)
                 LIMIT 5`,
            )
            .all(ftsQuery) as Array<{ id?: unknown; title?: unknown }>;

        const articleIds = rows.map((row) => (row && typeof row.id === 'string' ? row.id : null)).filter(Boolean) as string[];
        if (articleIds.length === 0) return [];

        const placeholders = articleIds.map(() => '?').join(',');
        const chunkRows = db
            .prepare(
                `SELECT c.id, c.article_id AS articleId, c.idx, c.content, a.title
                 FROM article_chunks c
                 JOIN articles a ON a.id = c.article_id
                 WHERE c.article_id IN (${placeholders})
                 ORDER BY a.updated_at DESC, c.idx ASC`,
            )
            .all(...articleIds) as Array<{ id?: unknown; articleId?: unknown; idx?: unknown; content?: unknown; title?: unknown }>;

        return chunkRows
            .filter((row) => !entitySourceArticleIdSet.has(typeof row?.articleId === 'string' ? row.articleId : ''))
            .slice(0, 10)
            .map((row) => {
                const articleId = typeof row?.articleId === 'string' ? row.articleId : '';
                const chunkId = typeof row?.id === 'string' ? row.id : '';
                const idx = typeof row?.idx === 'number' ? row.idx : Number(row?.idx ?? 0);
                return {
                    id: chunkId,
                    articleId,
                    title: typeof row?.title === 'string' ? row.title : '',
                    idx,
                    content: typeof row?.content === 'string' ? row.content : '',
                    score: 0.35,
                    source: { articleId, chunkId, idx },
                };
            })
            .filter((chunk) => chunk.id && chunk.articleId);
    };

    let keywordChunks: RagPassage[] = [];
    try {
        keywordChunks = runKeywordRecall(queryText);
    } catch (error) {
        const fallbackQuery = queryText.replace(/@/g, ' ').trim();
        if (fallbackQuery && fallbackQuery !== queryText) {
            try {
                keywordChunks = runKeywordRecall(fallbackQuery);
            } catch (fallbackError) {
                logger?.debug?.(
                    `[rag] keyword recall skipped: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
                );
            }
        } else {
            // Why: invalid MATCH syntax should not block RAG; semantic recall might still work.
            logger?.debug?.(`[rag] keyword recall skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    const chunkByStableId = new Map<string, RagPassage>();
    for (const chunk of [...semanticChunks, ...keywordChunks]) {
        if (!chunk || !chunk.id) continue;
        const existing = chunkByStableId.get(chunk.id);
        if (!existing || chunk.score > existing.score) chunkByStableId.set(chunk.id, chunk);
    }

    const mergedChunks = Array.from(chunkByStableId.values())
        .filter((chunk) => chunk.content)
        .sort((a, b) => b.score - a.score);

    const cardsMaxChars = Math.min(2000, Math.floor(maxChars * 0.4));
    const cardsBudget = trimToBudget([...characters, ...settings], (card) => card.content, cardsMaxChars);
    const keptCardIds = new Set(cardsBudget.kept.map((card) => card.id));
    const keptCharacters = characters.filter((card) => keptCardIds.has(card.id));
    const keptSettings = settings.filter((card) => keptCardIds.has(card.id));

    const remainingChars = Math.max(200, maxChars - cardsBudget.used);
    const limitedChunks = mergedChunks.slice(0, maxChunks);
    const chunkBudget = trimToBudget(limitedChunks, (chunk) => chunk.content, remainingChars);
    const nextCursor = mergedChunks.length > cursor + chunkBudget.kept.length ? String(cursor + chunkBudget.kept.length) : undefined;

    return {
        query: queryText,
        characters: keptCharacters,
        settings: keptSettings,
        passages: chunkBudget.kept,
        budget: {
            maxChars,
            usedChars: chunkBudget.used + cardsBudget.used,
            maxChunks,
            cursor: String(cursor),
            ...(typeof nextCursor === 'undefined' ? {} : { nextCursor }),
        },
    };
}
