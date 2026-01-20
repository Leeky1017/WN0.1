const { unifiedDiff } = require('../lib/unified-diff.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function nowIso() {
  return new Date().toISOString()
}

function generateSnapshotId() {
  const rand = Math.random().toString(16).slice(2, 10)
  return `snap_${Date.now()}_${rand}`
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

function assertActor(value) {
  if (typeof value === 'undefined') return 'user'
  if (value === 'user' || value === 'ai' || value === 'auto') return value
  return null
}

function readArticleRow(db, articleId) {
  if (!db) throw new Error('readArticleRow requires db')
  const id = coerceString(articleId)
  if (!id) return null
  return db.prepare('SELECT id, content FROM articles WHERE id = ?').get(id)
}

function readSnapshotRow(db, snapshotId) {
  if (!db) throw new Error('readSnapshotRow requires db')
  const id = coerceString(snapshotId)
  if (!id) return null
  return db.prepare('SELECT id, article_id, content, name, reason, actor, created_at FROM article_snapshots WHERE id = ?').get(id)
}

function registerVersionIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)
  const db = options.db ?? null
  const logger = options.logger ?? null

  handleInvoke('version:list', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const articleId = coerceString(payload?.articleId)
    if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'Invalid articleId', { articleId: payload?.articleId })

    const limit = parseLimit(payload?.limit)
    if (limit === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid limit', { limit: payload?.limit })
    const offset = parseOffsetCursor(payload?.cursor)
    if (offset === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: payload?.cursor })

    const article = readArticleRow(db, articleId)
    if (!article) throw createIpcError('NOT_FOUND', 'Article not found', { articleId })

    try {
      const totalRow = db.prepare('SELECT COUNT(*) AS total FROM article_snapshots WHERE article_id = ?').get(articleId)
      const total = typeof totalRow?.total === 'number' ? totalRow.total : Number(totalRow?.total ?? 0)

      const rows = db
        .prepare(
          `SELECT id, article_id, name, reason, actor, created_at
           FROM article_snapshots
           WHERE article_id = ?
           ORDER BY datetime(created_at) DESC, id DESC
           LIMIT ? OFFSET ?`
        )
        .all(articleId, limit, offset)

      const items = rows
        .map((row) => {
          const id = typeof row?.id === 'string' ? row.id : ''
          const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
          return {
            id,
            articleId,
            name: typeof row?.name === 'string' && row.name.trim() ? row.name : undefined,
            reason: typeof row?.reason === 'string' && row.reason.trim() ? row.reason : undefined,
            actor: row?.actor === 'ai' || row?.actor === 'auto' ? row.actor : 'user',
            createdAt,
          }
        })
        .filter((item) => item.id && item.createdAt)

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
      logger?.error?.('version', 'list failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to list versions', { message: error?.message })
    }
  })

  handleInvoke('version:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')

    const articleId = coerceString(payload?.articleId)
    if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'Invalid articleId', { articleId: payload?.articleId })

    const actor = assertActor(payload?.actor)
    if (!actor) throw createIpcError('INVALID_ARGUMENT', 'Invalid actor', { actor: payload?.actor })

    const explicitContent = typeof payload?.content === 'string' ? payload.content : null
    const article = readArticleRow(db, articleId)
    if (!article) throw createIpcError('NOT_FOUND', 'Article not found', { articleId })

    const content = explicitContent !== null ? explicitContent : typeof article.content === 'string' ? article.content : ''
    const snapshotId = generateSnapshotId()
    const createdAt = nowIso()

    const name = typeof payload?.name === 'string' && payload.name.trim() ? payload.name.trim() : null
    const reason = typeof payload?.reason === 'string' && payload.reason.trim() ? payload.reason.trim() : null

    try {
      db.prepare(
        `INSERT INTO article_snapshots (id, article_id, content, name, reason, actor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(snapshotId, articleId, content, name, reason, actor, createdAt)
      return { snapshotId }
    } catch (error) {
      logger?.error?.('version', 'create failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to create version snapshot', { message: error?.message })
    }
  })

  handleInvoke('version:restore', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const snapshotId = coerceString(payload?.snapshotId)
    if (!snapshotId) throw createIpcError('INVALID_ARGUMENT', 'Invalid snapshotId', { snapshotId: payload?.snapshotId })

    const row = readSnapshotRow(db, snapshotId)
    if (!row) throw createIpcError('NOT_FOUND', 'Snapshot not found', { snapshotId })

    const articleId = typeof row.article_id === 'string' ? row.article_id : ''
    const content = typeof row.content === 'string' ? row.content : ''
    if (!articleId) throw createIpcError('DB_ERROR', 'Snapshot row is invalid', { snapshotId })

    return { articleId, content }
  })

  handleInvoke('version:diff', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const fromSnapshotId = coerceString(payload?.fromSnapshotId)
    const toSnapshotId = coerceString(payload?.toSnapshotId)
    if (!fromSnapshotId) throw createIpcError('INVALID_ARGUMENT', 'Invalid fromSnapshotId', { fromSnapshotId: payload?.fromSnapshotId })
    if (!toSnapshotId) throw createIpcError('INVALID_ARGUMENT', 'Invalid toSnapshotId', { toSnapshotId: payload?.toSnapshotId })

    const from = readSnapshotRow(db, fromSnapshotId)
    const to = readSnapshotRow(db, toSnapshotId)
    if (!from) throw createIpcError('NOT_FOUND', 'Snapshot not found', { snapshotId: fromSnapshotId })
    if (!to) throw createIpcError('NOT_FOUND', 'Snapshot not found', { snapshotId: toSnapshotId })

    const fromText = typeof from.content === 'string' ? from.content : ''
    const toText = typeof to.content === 'string' ? to.content : ''

    try {
      const diff = unifiedDiff(fromText, toText)
      return { format: 'unified', diff }
    } catch (error) {
      logger?.error?.('version', 'diff failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to compute diff', { message: error?.message })
    }
  })
}

module.exports = { registerVersionIpcHandlers }

