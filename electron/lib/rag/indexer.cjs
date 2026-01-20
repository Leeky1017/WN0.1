const crypto = require('crypto')

const { chunkMarkdownToParagraphs } = require('./chunking.cjs')
const { parseEntityCard } = require('./entities.cjs')
const { DEFAULT_MODEL } = require('../embedding-service.cjs')

function toIsoNow() {
  return new Date().toISOString()
}

function createChunkId(articleId, idx, content) {
  const hash = crypto
    .createHash('sha256')
    .update(String(articleId))
    .update('\n')
    .update(String(idx))
    .update('\n')
    .update(String(content))
    .digest('hex')
    .slice(0, 24)
  return `${articleId}::${hash}`
}

function averageVectors(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) return null
  const dim = Array.isArray(vectors[0]) ? vectors[0].length : 0
  if (!dim) return null

  const acc = new Array(dim).fill(0)
  for (const vec of vectors) {
    if (!Array.isArray(vec) || vec.length !== dim) return null
    for (let i = 0; i < dim; i += 1) acc[i] += Number(vec[i]) || 0
  }
  for (let i = 0; i < dim; i += 1) acc[i] /= vectors.length
  return acc
}

function tableExists(db, name) {
  const row = db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ?").get(name)
  return Boolean(row?.ok)
}

class RagIndexer {
  #db
  #embeddingService
  #vectorStore
  #logger
  #queue
  #processing

  constructor(options = {}) {
    this.#db = options.db ?? null
    this.#embeddingService = options.embeddingService ?? null
    this.#vectorStore = options.vectorStore ?? null
    this.#logger = options.logger ?? null
    this.#queue = new Map()
    this.#processing = null
  }

  #assertReady() {
    if (!this.#db) throw new Error('RagIndexer requires db')
    if (!this.#embeddingService) throw new Error('RagIndexer requires embeddingService')
    if (!this.#vectorStore) throw new Error('RagIndexer requires vectorStore')
  }

  enqueueArticle(articleId) {
    const id = typeof articleId === 'string' ? articleId : ''
    if (!id) return
    this.#queue.set(id, true)
    this.#kick()
  }

  async flush() {
    await this.#processing
  }

  #kick() {
    if (this.#processing) return
    this.#processing = this.#runLoop().finally(() => {
      this.#processing = null
      if (this.#queue.size > 0) this.#kick()
    })
  }

  async #runLoop() {
    this.#assertReady()
    while (this.#queue.size > 0) {
      const next = this.#queue.keys().next().value
      this.#queue.delete(next)
      await this.#indexArticle(next).catch((e) =>
        this.#logger?.warn?.('rag-indexer', 'index failed', { articleId: next, message: e?.message })
      )
    }
  }

  async handleDeletedArticle(articleId) {
    this.#assertReady()
    const id = typeof articleId === 'string' ? articleId : ''
    if (!id) return
    const db = this.#db

    try {
      if (tableExists(db, 'article_chunks')) {
        db.prepare('DELETE FROM article_chunks WHERE article_id = ?').run(id)
      }
    } catch (e) {
      this.#logger?.warn?.('rag-indexer', 'failed to delete chunks', { articleId: id, message: e?.message })
    }

    try {
      if (tableExists(db, 'articles_vec')) db.prepare('DELETE FROM articles_vec WHERE id = ?').run(id)
    } catch {
      // ignore (vec table may not exist yet)
    }

    try {
      if (tableExists(db, 'article_chunks_vec')) db.prepare('DELETE FROM article_chunks_vec WHERE article_id = ?').run(id)
    } catch {
      // ignore
    }

    try {
      const entities = tableExists(db, 'entity_cards')
        ? db.prepare('SELECT id FROM entity_cards WHERE source_article_id = ?').all(id)
        : []
      if (tableExists(db, 'entity_cards')) db.prepare('DELETE FROM entity_cards WHERE source_article_id = ?').run(id)
      if (tableExists(db, 'entity_vec')) {
        const del = db.prepare('DELETE FROM entity_vec WHERE entity_id = ?')
        for (const row of entities) {
          const entityId = typeof row?.id === 'string' ? row.id : ''
          if (entityId) del.run(entityId)
        }
      }
    } catch (e) {
      this.#logger?.warn?.('rag-indexer', 'failed to delete entity cards', { articleId: id, message: e?.message })
    }
  }

  async #indexArticle(articleId) {
    const db = this.#db
    const row = db.prepare('SELECT id, content FROM articles WHERE id = ?').get(articleId)
    if (!row || typeof row.content !== 'string') {
      await this.handleDeletedArticle(articleId)
      return
    }

    const content = row.content
    const now = toIsoNow()

    // 1) Chunk table
    const paragraphs = chunkMarkdownToParagraphs(content)
    const chunks = paragraphs.map((text, idx) => ({
      id: createChunkId(articleId, idx, text),
      article_id: articleId,
      idx,
      content: text,
      created_at: now,
      updated_at: now,
    }))

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM article_chunks WHERE article_id = ?').run(articleId)
      const insert = db.prepare(
        'INSERT INTO article_chunks (id, article_id, idx, content, created_at, updated_at) VALUES (@id, @article_id, @idx, @content, @created_at, @updated_at)'
      )
      for (const chunk of chunks) insert.run(chunk)
    })
    tx()

    if (chunks.length > 0) {
      // 2) Chunk embeddings
      const vectors = []
      const batchSize = 24
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        const encoded = await this.#embeddingService.encode(
          batch.map((c) => c.content),
          { model: DEFAULT_MODEL }
        )
        this.#vectorStore.ensureChunkIndex(encoded.dimension)
        vectors.push(...encoded.vectors)
      }

      // 3) Replace chunk vec rows for this article
      this.#vectorStore.replaceChunkEmbeddings(
        articleId,
        chunks.map((chunk, idx) => ({ chunkId: chunk.id, embedding: vectors[idx] }))
      )

      // 4) Article-level embedding (mean of chunk embeddings)
      const articleVector = averageVectors(vectors)
      if (articleVector) {
        this.#vectorStore.ensureReady(articleVector.length)
        this.#vectorStore.upsertArticleEmbeddings([{ id: articleId, embedding: articleVector }])
      }
    }

    // 5) Entity cards (optional, derived from markdown front matter)
    const card = parseEntityCard(articleId, content)
    if (card) {
      const existing = db.prepare('SELECT id FROM entity_cards WHERE source_article_id = ?').all(articleId)
      const existingIds = existing.map((r) => (r && typeof r.id === 'string' ? r.id : null)).filter(Boolean)

      const upsert = db.prepare(
        `INSERT INTO entity_cards (id, type, name, aliases, content, source_article_id, created_at, updated_at)
         VALUES (@id, @type, @name, @aliases, @content, @source_article_id, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           type=excluded.type,
           name=excluded.name,
           aliases=excluded.aliases,
           content=excluded.content,
           source_article_id=excluded.source_article_id,
           updated_at=excluded.updated_at`
      )
      upsert.run({
        id: card.id,
        type: card.type,
        name: card.name,
        aliases: JSON.stringify(card.aliases),
        content: card.content,
        source_article_id: card.sourceArticleId,
        created_at: now,
        updated_at: now,
      })

      for (const oldId of existingIds) {
        if (oldId === card.id) continue
        db.prepare('DELETE FROM entity_cards WHERE id = ?').run(oldId)
        try {
          if (tableExists(db, 'entity_vec')) db.prepare('DELETE FROM entity_vec WHERE entity_id = ?').run(oldId)
        } catch {
          // ignore
        }
      }

      const encoded = await this.#embeddingService.encode([card.content], { model: DEFAULT_MODEL })
      this.#vectorStore.ensureEntityIndex(encoded.dimension)
      this.#vectorStore.upsertEntityEmbeddings([{ entityId: card.id, entityType: card.type, embedding: encoded.vectors[0] }])
    } else {
      // Remove any entity cards previously derived from this article.
      const existing = db.prepare('SELECT id FROM entity_cards WHERE source_article_id = ?').all(articleId)
      const existingIds = existing.map((r) => (r && typeof r.id === 'string' ? r.id : null)).filter(Boolean)
      if (existingIds.length > 0) {
        db.prepare('DELETE FROM entity_cards WHERE source_article_id = ?').run(articleId)
        try {
          if (tableExists(db, 'entity_vec')) {
            const del = db.prepare('DELETE FROM entity_vec WHERE entity_id = ?')
            for (const oldId of existingIds) del.run(oldId)
          }
        } catch {
          // ignore
        }
      }
    }

    this.#logger?.debug?.('rag-indexer', 'indexed', { articleId, chunks: chunks.length, entityCard: Boolean(card) })
  }
}

module.exports = { RagIndexer }

