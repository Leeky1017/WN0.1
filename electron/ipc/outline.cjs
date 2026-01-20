function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function toIsoNow() {
  return new Date().toISOString()
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function stringifyJson(value, options = {}) {
  const maxBytes = typeof options.maxBytes === 'number' && options.maxBytes > 0 ? options.maxBytes : 512 * 1024
  let json = null
  try {
    json = JSON.stringify(value)
  } catch {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON payload')
  }
  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes > maxBytes) throw createIpcError('INVALID_ARGUMENT', 'Payload too large', { bytes, maxBytes })
  return json
}

function parseJson(raw) {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function registerOutlineIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('outline:get', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const articleId = coerceString(payload?.articleId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'articleId is required')

    const row = db.prepare('SELECT outline_json, updated_at FROM outlines WHERE project_id = ? AND article_id = ?').get(projectId, articleId)
    if (!row || typeof row.outline_json !== 'string') return { outline: null }

    const outline = parseJson(row.outline_json)
    if (!Array.isArray(outline)) {
      logger?.warn?.('outline', 'invalid outline_json', { projectId, articleId })
      throw createIpcError('DB_ERROR', 'Stored outline is corrupted')
    }
    const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : undefined
    return { outline, updatedAt }
  })

  handleInvoke('outline:save', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const articleId = coerceString(payload?.articleId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'articleId is required')

    if (!('outline' in (payload || {}))) throw createIpcError('INVALID_ARGUMENT', 'outline is required')
    const outline = payload.outline
    if (!Array.isArray(outline)) throw createIpcError('INVALID_ARGUMENT', 'outline must be an array')

    const projectExists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
    if (!projectExists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId })

    const now = toIsoNow()
    const outlineJson = stringifyJson(outline)

    db.prepare(
      `INSERT INTO outlines (project_id, article_id, outline_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(project_id, article_id) DO UPDATE SET
         outline_json=excluded.outline_json,
         updated_at=excluded.updated_at`
    ).run(projectId, articleId, outlineJson, now, now)

    return { saved: true, updatedAt: now }
  })
}

module.exports = { registerOutlineIpcHandlers }

