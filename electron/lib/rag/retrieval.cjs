const { DEFAULT_MODEL } = require('../embedding-service.cjs')
const { extractExplicitMentions, containsEntity } = require('./entities.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function parseCursor(cursor) {
  if (typeof cursor === 'undefined' || cursor === null || cursor === '') return 0
  const parsed = Number.parseInt(String(cursor), 10)
  if (Number.isNaN(parsed) || parsed < 0) return null
  return parsed
}

function distanceToScore(distance) {
  if (!Number.isFinite(distance)) return 0
  return 1 / (1 + Math.max(0, distance))
}

function parseAliases(raw) {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((v) => String(v).trim()).filter(Boolean)
  } catch {
    return []
  }
}

function trimToBudget(items, getText, maxChars) {
  const kept = []
  let used = 0
  for (const item of items) {
    const text = getText(item)
    const next = used + text.length
    if (kept.length > 0 && next > maxChars) break
    kept.push(item)
    used = next
  }
  return { kept, used }
}

async function retrieveRagContext(options = {}) {
  const db = options.db ?? null
  const embeddingService = options.embeddingService ?? null
  const vectorStore = options.vectorStore ?? null
  const logger = options.logger ?? null

  if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
  if (!embeddingService) throw createIpcError('MODEL_NOT_READY', 'Embedding service is not ready')
  if (!vectorStore) throw createIpcError('DB_ERROR', 'Vector store is not ready')

  const queryText = typeof options.queryText === 'string' ? options.queryText.trim() : ''
  if (!queryText) throw createIpcError('INVALID_ARGUMENT', 'queryText is required')

  const budget = options.budget && typeof options.budget === 'object' ? options.budget : {}
  const maxChars = typeof budget.maxChars === 'number' ? Math.max(500, Math.min(20_000, budget.maxChars)) : 4000
  const maxChunks = typeof budget.maxChunks === 'number' ? Math.max(1, Math.min(20, budget.maxChunks)) : 8
  const maxCharacters = typeof budget.maxCharacters === 'number' ? Math.max(0, Math.min(20, budget.maxCharacters)) : 5
  const maxSettings = typeof budget.maxSettings === 'number' ? Math.max(0, Math.min(20, budget.maxSettings)) : 5

  const cursor = parseCursor(budget.cursor)
  if (cursor === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: budget.cursor })

  const thresholdRaw = budget.threshold
  const threshold =
    typeof thresholdRaw === 'undefined' || thresholdRaw === null || thresholdRaw === ''
      ? null
      : Number.parseFloat(String(thresholdRaw))
  if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)) {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid threshold', { threshold: thresholdRaw })
  }
  const maxDistance = threshold && threshold > 0 ? 1 / threshold - 1 : null

  const encoded = await embeddingService.encode([queryText], { model: DEFAULT_MODEL })
  const queryEmbedding = encoded.vectors[0]
  const dimension = encoded.dimension

  // Entities: exact match first, semantic fallback.
  const entityRows = db
    .prepare('SELECT id, type, name, aliases, content, source_article_id AS sourceArticleId, updated_at AS updatedAt FROM entity_cards')
    .all()

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
    .filter((e) => e.id && e.type && e.name && e.content)

  const entitySourceArticleIdSet = new Set(entities.map((e) => e.sourceArticleId).filter(Boolean))

  const explicitMentions = extractExplicitMentions(queryText)
  const explicitlyMatched = entities.filter((e) => {
    if (explicitMentions.includes(e.name)) return true
    for (const alias of e.aliases) {
      if (explicitMentions.includes(alias)) return true
    }
    return false
  })

  const textMatched = entities.filter((e) => containsEntity(queryText, e))
  const entityMatched = new Map()
  for (const entity of [...explicitlyMatched, ...textMatched]) entityMatched.set(entity.id, entity)

  let recalledEntities = Array.from(entityMatched.values())
  if (recalledEntities.length === 0) {
    try {
      vectorStore.ensureEntityIndex(dimension)
      const similar = vectorStore.querySimilarEntities(queryEmbedding, { topK: 10, maxDistance })
      const byId = new Map(entities.map((e) => [e.id, e]))
      recalledEntities = similar
        .map((hit) => {
          const card = byId.get(hit.entityId)
          if (!card) return null
          return { ...card, score: distanceToScore(hit.distance) }
        })
        .filter(Boolean)
    } catch (e) {
      logger?.warn?.('rag', 'entity semantic recall skipped', { message: e?.message })
    }
  }

  const characters = recalledEntities
    .filter((e) => e.type === 'character')
    .slice(0, maxCharacters)
    .map((e) => ({ ...e, score: e.score ?? 1 }))
  const settings = recalledEntities
    .filter((e) => e.type === 'setting')
    .slice(0, maxSettings)
    .map((e) => ({ ...e, score: e.score ?? 1 }))

  // Chunks: semantic recall + keyword (article-level) recall.
  let semanticChunkHits = []
  try {
    vectorStore.ensureChunkIndex(dimension)
    semanticChunkHits = vectorStore.querySimilarChunks(queryEmbedding, { topK: 20, offset: cursor, maxDistance })
  } catch (e) {
    logger?.warn?.('rag', 'chunk semantic recall skipped', { message: e?.message })
  }

  const chunkIds = semanticChunkHits.map((h) => h.chunkId)
  const chunkById = new Map()
  if (chunkIds.length > 0) {
    const placeholders = chunkIds.map(() => '?').join(',')
    const rows = db
      .prepare(`SELECT c.id, c.article_id AS articleId, c.idx, c.content, a.title FROM article_chunks c JOIN articles a ON a.id = c.article_id WHERE c.id IN (${placeholders})`)
      .all(...chunkIds)
    for (const row of rows) {
      if (!row || typeof row.id !== 'string') continue
      chunkById.set(row.id, row)
    }
  }

  const semanticChunks = semanticChunkHits
    .map((hit) => {
      if (entitySourceArticleIdSet.has(hit.articleId)) return null
      const row = chunkById.get(hit.chunkId)
      if (!row) return null
      return {
        id: hit.chunkId,
        articleId: hit.articleId,
        title: typeof row?.title === 'string' ? row.title : hit.articleId,
        idx: typeof row?.idx === 'number' ? row.idx : Number(row?.idx ?? 0),
        content: typeof row?.content === 'string' ? row.content : '',
        score: distanceToScore(hit.distance),
        source: {
          articleId: hit.articleId,
          chunkId: hit.chunkId,
          idx: typeof row?.idx === 'number' ? row.idx : Number(row?.idx ?? 0),
        },
      }
    })
    .filter(Boolean)

  let keywordChunks = []
  try {
    const rows = db
      .prepare(
        `SELECT a.id AS id, a.title AS title, bm25(articles_fts) AS bm25
         FROM articles_fts
         JOIN articles a ON a.rowid = articles_fts.rowid
         WHERE articles_fts MATCH ?
         ORDER BY bm25(articles_fts)
         LIMIT 5`
      )
      .all(queryText)

    const articleIds = rows.map((r) => (r && typeof r.id === 'string' ? r.id : null)).filter(Boolean)
    if (articleIds.length > 0) {
      const placeholders = articleIds.map(() => '?').join(',')
      const chunkRows = db
        .prepare(
          `SELECT c.id, c.article_id AS articleId, c.idx, c.content, a.title
           FROM article_chunks c
           JOIN articles a ON a.id = c.article_id
           WHERE c.article_id IN (${placeholders})
           ORDER BY a.updated_at DESC, c.idx ASC`
        )
        .all(...articleIds)

      keywordChunks = chunkRows
        .filter((row) => !entitySourceArticleIdSet.has(row?.articleId))
        .slice(0, 10)
        .map((row) => ({
          id: typeof row?.id === 'string' ? row.id : '',
          articleId: typeof row?.articleId === 'string' ? row.articleId : '',
          title: typeof row?.title === 'string' ? row.title : '',
          idx: typeof row?.idx === 'number' ? row.idx : Number(row?.idx ?? 0),
          content: typeof row?.content === 'string' ? row.content : '',
          score: 0.35,
          source: {
            articleId: typeof row?.articleId === 'string' ? row.articleId : '',
            chunkId: typeof row?.id === 'string' ? row.id : '',
            idx: typeof row?.idx === 'number' ? row.idx : Number(row?.idx ?? 0),
          },
        }))
        .filter((c) => c && c.id && c.articleId)
    }
  } catch (e) {
    // Invalid MATCH query or FTS errors should not block RAG; semantic recall can still work.
    logger?.debug?.('rag', 'keyword recall skipped', { message: e?.message })
  }

  const chunkByStableId = new Map()
  for (const chunk of [...semanticChunks, ...keywordChunks]) {
    if (!chunk || !chunk.id) continue
    const existing = chunkByStableId.get(chunk.id)
    if (!existing || chunk.score > existing.score) chunkByStableId.set(chunk.id, chunk)
  }

  const mergedChunks = Array.from(chunkByStableId.values())
    .filter((c) => c.content)
    .sort((a, b) => b.score - a.score)

  const cardsMaxChars = Math.min(2000, Math.floor(maxChars * 0.4))
  const cardsBudget = trimToBudget([...characters, ...settings], (c) => c.content, cardsMaxChars)
  const keptCardIds = new Set(cardsBudget.kept.map((c) => c.id))
  const keptCharacters = characters.filter((c) => keptCardIds.has(c.id))
  const keptSettings = settings.filter((c) => keptCardIds.has(c.id))

  const remainingChars = Math.max(200, maxChars - cardsBudget.used)
  const limitedChunks = mergedChunks.slice(0, maxChunks)
  const chunkBudget = trimToBudget(limitedChunks, (c) => c.content, remainingChars)
  const nextCursor = mergedChunks.length > cursor + chunkBudget.kept.length ? String(cursor + chunkBudget.kept.length) : undefined

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
      nextCursor,
    },
  }
}

module.exports = { retrieveRagContext }
