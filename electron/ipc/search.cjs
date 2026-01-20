const { DEFAULT_MODEL } = require('../lib/embedding-service.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function parseLimit(input) {
  if (typeof input === 'undefined') return 20
  const parsed = Number.parseInt(String(input), 10)
  if (Number.isNaN(parsed) || parsed <= 0) return null
  return Math.min(parsed, 50)
}

function parseOffsetCursor(cursor) {
  if (typeof cursor === 'undefined' || cursor === null || cursor === '') return 0
  const parsed = Number.parseInt(String(cursor), 10)
  if (Number.isNaN(parsed) || parsed < 0) return null
  return parsed
}

function isFtsSyntaxError(error) {
  const message = error && typeof error === 'object' ? String(error.message || '') : ''
  return message.toLowerCase().includes('fts5') && message.toLowerCase().includes('syntax')
}

function registerSearchIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const embeddingService = options.embeddingService ?? null
  const vectorStore = options.vectorStore ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('search:fulltext', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const query = typeof payload?.query === 'string' ? payload.query.trim() : ''
    if (!query) throw createIpcError('INVALID_ARGUMENT', 'Query is required')

    const limit = parseLimit(payload?.limit)
    if (limit === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid limit', { limit: payload?.limit })
    const offset = parseOffsetCursor(payload?.cursor)
    if (offset === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: payload?.cursor })

    try {
      const totalRow = db.prepare('SELECT COUNT(*) AS total FROM articles_fts WHERE articles_fts MATCH ?').get(query)
      const total = typeof totalRow?.total === 'number' ? totalRow.total : Number(totalRow?.total ?? 0)

      const rows = db
        .prepare(
          `SELECT a.id AS id,
                  a.title AS title,
                  snippet(articles_fts, 1, '', '', '…', 10) AS snippet,
                  bm25(articles_fts) AS bm25
           FROM articles_fts
           JOIN articles a ON a.rowid = articles_fts.rowid
           WHERE articles_fts MATCH ?
           ORDER BY bm25(articles_fts)
           LIMIT ? OFFSET ?`
        )
        .all(query, limit, offset)

      const items = rows
        .map((row) => {
          const id = typeof row?.id === 'string' ? row.id : ''
          const title = typeof row?.title === 'string' ? row.title : ''
          const snippet = typeof row?.snippet === 'string' ? row.snippet : ''
          const bm25 = typeof row?.bm25 === 'number' ? row.bm25 : Number(row?.bm25 ?? 0)
          return {
            id,
            title,
            snippet,
            score: Number.isFinite(bm25) ? -bm25 : undefined,
          }
        })
        .filter((hit) => hit.id && hit.title)

      const nextOffset = offset + items.length
      const nextCursor = nextOffset < total ? String(nextOffset) : undefined

      return {
        items,
        page: {
          limit,
          cursor: String(offset),
          nextCursor,
          total,
        },
      }
    } catch (error) {
      if (isFtsSyntaxError(error)) throw createIpcError('INVALID_ARGUMENT', 'Invalid fulltext query', { query })
      logger?.error?.('search', 'fulltext query failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Fulltext search failed', { message: error?.message })
    }
  })

  handleInvoke('search:semantic', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    if (!embeddingService) throw createIpcError('MODEL_NOT_READY', 'Embedding service is not ready')
    if (!vectorStore) throw createIpcError('DB_ERROR', 'Vector store is not ready')

    const query = typeof payload?.query === 'string' ? payload.query.trim() : ''
    if (!query) throw createIpcError('INVALID_ARGUMENT', 'Query is required')

    const limit = parseLimit(payload?.limit)
    if (limit === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid limit', { limit: payload?.limit })
    const offset = parseOffsetCursor(payload?.cursor)
    if (offset === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: payload?.cursor })

    const thresholdRaw = payload?.threshold
    const threshold =
      typeof thresholdRaw === 'undefined' || thresholdRaw === null || thresholdRaw === ''
        ? null
        : Number.parseFloat(String(thresholdRaw))
    if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid threshold', { threshold: thresholdRaw })
    }

    const maxDistance = threshold && threshold > 0 ? 1 / threshold - 1 : null

    try {
      const encoded = await embeddingService.encode([query], { model: DEFAULT_MODEL })
      vectorStore.ensureReady(encoded.dimension)

      const hits = vectorStore.querySimilarArticles(encoded.vectors[0], { topK: limit, offset, maxDistance })
      const ids = hits.map((h) => h.id)

      const articleById = new Map()
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',')
        const rows = db.prepare(`SELECT id, title, content FROM articles WHERE id IN (${placeholders})`).all(...ids)
        for (const row of rows) {
          if (!row || typeof row.id !== 'string') continue
          articleById.set(row.id, row)
        }
      }

      const items = hits
        .map((hit) => {
          const row = articleById.get(hit.id)
          const title = typeof row?.title === 'string' ? row.title : hit.id
          const content = typeof row?.content === 'string' ? row.content : ''
          const snippetBase = content.replace(/\s+/g, ' ').trim()
          const snippet = snippetBase.length > 160 ? `${snippetBase.slice(0, 160)}…` : snippetBase
          const distance = hit.distance
          const score = Number.isFinite(distance) ? 1 / (1 + Math.max(0, distance)) : 0
          return { id: hit.id, title, snippet, score }
        })
        .filter((hit) => hit.id && hit.title)

      const nextCursor = items.length === limit ? String(offset + items.length) : undefined

      return {
        items,
        page: {
          limit,
          cursor: String(offset),
          nextCursor,
        },
      }
    } catch (error) {
      if (error?.ipcError?.code) throw error
      logger?.error?.('search', 'semantic query failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Semantic search failed', { message: error?.message })
    }
  })
}

module.exports = { registerSearchIpcHandlers }
