const sqliteVec = require('sqlite-vec')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function getStoredJsonSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row || typeof row.value !== 'string') return null
  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

function setStoredJsonSetting(db, key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value))
}

function stringifyVector(vector) {
  if (!Array.isArray(vector)) throw new Error('vector must be an array')
  return `[${vector.map((v) => Number(v)).join(',')}]`
}

class VectorStore {
  #db
  #logger
  #loaded

  constructor(options = {}) {
    this.#db = options.db ?? null
    this.#logger = options.logger ?? null
    this.#loaded = false
  }

  #assertDb() {
    if (!this.#db) throw new Error('VectorStore requires db')
    return this.#db
  }

  ensureReady(dimension) {
    const db = this.#assertDb()
    if (typeof dimension !== 'number' || !Number.isFinite(dimension) || dimension <= 0) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid embedding dimension', { dimension })
    }

    if (!this.#loaded) {
      try {
        sqliteVec.load(db)
        this.#loaded = true
      } catch (e) {
        const loadablePath = (() => {
          try {
            return sqliteVec.getLoadablePath()
          } catch {
            return null
          }
        })()
        this.#logger?.error?.('vec', 'failed to load sqlite-vec', { message: e?.message, loadablePath })
        throw createIpcError('DB_ERROR', 'Failed to load sqlite-vec extension', { message: e?.message, loadablePath })
      }
    }

    const storedDimension = getStoredJsonSetting(db, 'embedding.dimension')
    if (storedDimension !== null && storedDimension !== dimension) {
      throw createIpcError('CONFLICT', 'Embedding dimension mismatch', {
        expected: storedDimension,
        received: dimension,
        recovery: "Rebuild vector index: delete vec tables and re-run embedding:index for all items.",
      })
    }

    try {
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS articles_vec USING vec0(
        id TEXT PRIMARY KEY,
        embedding FLOAT[${dimension}]
      )`)
    } catch (e) {
      this.#logger?.error?.('vec', 'failed to create vec table', { message: e?.message })
      throw createIpcError('DB_ERROR', 'Failed to initialize vector schema', { message: e?.message })
    }

    if (storedDimension === null) setStoredJsonSetting(db, 'embedding.dimension', dimension)
  }

  ensureChunkIndex(dimension) {
    this.ensureReady(dimension)
    const db = this.#assertDb()
    try {
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS article_chunks_vec USING vec0(
        chunk_id TEXT PRIMARY KEY,
        article_id TEXT,
        embedding FLOAT[${dimension}]
      )`)
    } catch (e) {
      this.#logger?.error?.('vec', 'failed to create chunk vec table', { message: e?.message })
      throw createIpcError('DB_ERROR', 'Failed to initialize chunk vector schema', { message: e?.message })
    }
  }

  ensureEntityIndex(dimension) {
    this.ensureReady(dimension)
    const db = this.#assertDb()
    try {
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS entity_vec USING vec0(
        entity_id TEXT PRIMARY KEY,
        entity_type TEXT,
        embedding FLOAT[${dimension}]
      )`)
    } catch (e) {
      this.#logger?.error?.('vec', 'failed to create entity vec table', { message: e?.message })
      throw createIpcError('DB_ERROR', 'Failed to initialize entity vector schema', { message: e?.message })
    }
  }

  upsertArticleEmbeddings(items) {
    const db = this.#assertDb()
    if (!Array.isArray(items)) throw createIpcError('INVALID_ARGUMENT', 'items must be an array')

    const tx = db.transaction(() => {
      const del = db.prepare('DELETE FROM articles_vec WHERE id = ?')
      const ins = db.prepare('INSERT INTO articles_vec(id, embedding) VALUES (?, ?)')

      for (const item of items) {
        const id = typeof item?.id === 'string' ? item.id : ''
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'item.id is required')
        const embedding = item?.embedding
        del.run(id)
        ins.run(id, stringifyVector(embedding))
      }
    })

    tx()
  }

  replaceChunkEmbeddings(articleId, chunks) {
    const db = this.#assertDb()
    const article_id = typeof articleId === 'string' ? articleId : ''
    if (!article_id) throw createIpcError('INVALID_ARGUMENT', 'articleId is required')
    if (!Array.isArray(chunks)) throw createIpcError('INVALID_ARGUMENT', 'chunks must be an array')

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM article_chunks_vec WHERE article_id = ?').run(article_id)
      const ins = db.prepare('INSERT INTO article_chunks_vec(chunk_id, article_id, embedding) VALUES (?, ?, ?)')
      for (const chunk of chunks) {
        const chunkId = typeof chunk?.chunkId === 'string' ? chunk.chunkId : ''
        if (!chunkId) throw createIpcError('INVALID_ARGUMENT', 'chunkId is required')
        ins.run(chunkId, article_id, stringifyVector(chunk?.embedding))
      }
    })

    tx()
  }

  upsertEntityEmbeddings(items) {
    const db = this.#assertDb()
    if (!Array.isArray(items)) throw createIpcError('INVALID_ARGUMENT', 'items must be an array')

    const tx = db.transaction(() => {
      const del = db.prepare('DELETE FROM entity_vec WHERE entity_id = ?')
      const ins = db.prepare('INSERT INTO entity_vec(entity_id, entity_type, embedding) VALUES (?, ?, ?)')
      for (const item of items) {
        const id = typeof item?.entityId === 'string' ? item.entityId : ''
        const type = typeof item?.entityType === 'string' ? item.entityType : ''
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'entityId is required')
        if (!type) throw createIpcError('INVALID_ARGUMENT', 'entityType is required')
        del.run(id)
        ins.run(id, type, stringifyVector(item?.embedding))
      }
    })

    tx()
  }

  querySimilarArticles(queryEmbedding, options = {}) {
    const db = this.#assertDb()
    const topK = typeof options.topK === 'number' ? Math.max(1, Math.min(50, options.topK)) : 20
    const offset = typeof options.offset === 'number' && options.offset >= 0 ? options.offset : 0
    const maxDistance =
      typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0
        ? options.maxDistance
        : null

    const vector = stringifyVector(queryEmbedding)
    const k = Math.min(200, offset + topK)

    const rows =
      maxDistance === null
        ? db
            .prepare(`SELECT id, distance FROM articles_vec WHERE embedding MATCH ? AND k = ? ORDER BY distance`)
            .all(vector, k)
        : db
            .prepare(
              `SELECT id, distance FROM articles_vec WHERE embedding MATCH ? AND k = ? AND distance <= ? ORDER BY distance`
            )
            .all(vector, k, maxDistance)

    return rows
      .map((row) => ({
        id: typeof row?.id === 'string' ? row.id : '',
        distance: typeof row?.distance === 'number' ? row.distance : Number(row?.distance ?? 0),
      }))
      .filter((r) => r.id)
      .slice(offset, offset + topK)
  }

  querySimilarChunks(queryEmbedding, options = {}) {
    const db = this.#assertDb()
    const topK = typeof options.topK === 'number' ? Math.max(1, Math.min(50, options.topK)) : 20
    const offset = typeof options.offset === 'number' && options.offset >= 0 ? options.offset : 0
    const maxDistance =
      typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0
        ? options.maxDistance
        : null

    const articleId = typeof options.articleId === 'string' ? options.articleId : null

    const vector = stringifyVector(queryEmbedding)
    const k = Math.min(200, offset + topK)

    const clauses = ['embedding MATCH ?', 'k = ?']
    const params = [vector, k]
    if (articleId) {
      clauses.push('article_id = ?')
      params.push(articleId)
    }
    if (maxDistance !== null) {
      clauses.push('distance <= ?')
      params.push(maxDistance)
    }

    const rows = db
      .prepare(`SELECT chunk_id, article_id, distance FROM article_chunks_vec WHERE ${clauses.join(' AND ')} ORDER BY distance`)
      .all(...params)

    return rows
      .map((row) => ({
        chunkId: typeof row?.chunk_id === 'string' ? row.chunk_id : '',
        articleId: typeof row?.article_id === 'string' ? row.article_id : '',
        distance: typeof row?.distance === 'number' ? row.distance : Number(row?.distance ?? 0),
      }))
      .filter((r) => r.chunkId && r.articleId)
      .slice(offset, offset + topK)
  }

  querySimilarEntities(queryEmbedding, options = {}) {
    const db = this.#assertDb()
    const topK = typeof options.topK === 'number' ? Math.max(1, Math.min(20, options.topK)) : 10
    const maxDistance =
      typeof options.maxDistance === 'number' && Number.isFinite(options.maxDistance) && options.maxDistance >= 0
        ? options.maxDistance
        : null

    const entityType = typeof options.entityType === 'string' ? options.entityType : null

    const vector = stringifyVector(queryEmbedding)
    const k = Math.min(100, topK)

    const clauses = ['embedding MATCH ?', 'k = ?']
    const params = [vector, k]
    if (entityType) {
      clauses.push('entity_type = ?')
      params.push(entityType)
    }
    if (maxDistance !== null) {
      clauses.push('distance <= ?')
      params.push(maxDistance)
    }

    const rows = db
      .prepare(`SELECT entity_id, entity_type, distance FROM entity_vec WHERE ${clauses.join(' AND ')} ORDER BY distance`)
      .all(...params)

    return rows
      .map((row) => ({
        entityId: typeof row?.entity_id === 'string' ? row.entity_id : '',
        entityType: typeof row?.entity_type === 'string' ? row.entity_type : '',
        distance: typeof row?.distance === 'number' ? row.distance : Number(row?.distance ?? 0),
      }))
      .filter((r) => r.entityId && r.entityType)
  }
}

module.exports = { VectorStore }
