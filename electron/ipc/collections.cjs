/**
 * Collection CRUD IPC handlers.
 * Implements collection:create/list/update/delete channels.
 */

const { randomUUID } = require('node:crypto')

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

/**
 * Maps a database row to a Collection object.
 * @param {object|null} row - The database row
 * @returns {object} - The normalized collection object
 */
function mapCollectionRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const name = typeof row?.name === 'string' ? row.name : ''
  const description = typeof row?.description === 'string' ? row.description : null
  const color = typeof row?.color === 'string' ? row.color : null
  const icon = typeof row?.icon === 'string' ? row.icon : null
  const order = typeof row?.display_order === 'number' ? row.display_order : 0
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''
  return {
    id,
    name,
    description: description || undefined,
    color: color || undefined,
    icon: icon || undefined,
    order,
    createdAt,
    updatedAt,
  }
}

/**
 * Validates a color string (hex format).
 * @param {string} color - The color to validate
 * @returns {boolean} - True if valid
 */
function isValidColor(color) {
  if (!color) return true
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * Gets the next display order for collections.
 * @param {object} db - The better-sqlite3 database instance
 * @returns {number} - The next order value
 */
function getNextOrder(db) {
  const row = db.prepare('SELECT MAX(display_order) as max_order FROM collections').get()
  return (typeof row?.max_order === 'number' ? row.max_order : 0) + 1
}

function registerCollectionsIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('collection:list', async () => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const rows = db
      .prepare('SELECT id, name, description, color, icon, display_order, created_at, updated_at FROM collections ORDER BY display_order ASC, created_at ASC')
      .all()
    return { collections: rows.map(mapCollectionRow).filter((c) => c.id && c.name) }
  })

  handleInvoke('collection:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const name = coerceString(payload?.name)
    if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required')
    if (name.length > 100) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 100 })

    const description = coerceString(payload?.description) || null
    const color = coerceString(payload?.color) || null
    const icon = coerceString(payload?.icon) || null

    if (color && !isValidColor(color)) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid color format (expected #RRGGBB)', { color })
    }

    const id = randomUUID()
    const now = toIsoNow()
    const order = getNextOrder(db)

    db.prepare(
      `INSERT INTO collections (id, name, description, color, icon, display_order, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, description, color, icon, order, now, now)

    const row = db
      .prepare('SELECT id, name, description, color, icon, display_order, created_at, updated_at FROM collections WHERE id = ?')
      .get(id)
    return { collection: mapCollectionRow(row) }
  })

  handleInvoke('collection:update', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = db.prepare('SELECT id FROM collections WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Collection not found', { id })

    const name = typeof payload?.name === 'string' ? payload.name.trim() : undefined
    const description = typeof payload?.description === 'string' ? payload.description.trim() : undefined
    const color = typeof payload?.color === 'string' ? payload.color.trim() : undefined
    const icon = typeof payload?.icon === 'string' ? payload.icon.trim() : undefined
    const order = typeof payload?.order === 'number' && Number.isFinite(payload.order) ? Math.max(0, Math.floor(payload.order)) : undefined

    if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty')
    if (typeof name === 'string' && name.length > 100) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 100 })
    if (color && !isValidColor(color)) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid color format (expected #RRGGBB)', { color })
    }

    const sets = []
    const params = { id }

    if (typeof name === 'string') {
      sets.push('name = @name')
      params.name = name
    }
    if (typeof description === 'string') {
      sets.push('description = @description')
      params.description = description || null
    }
    if (typeof color === 'string') {
      sets.push('color = @color')
      params.color = color || null
    }
    if (typeof icon === 'string') {
      sets.push('icon = @icon')
      params.icon = icon || null
    }
    if (typeof order === 'number') {
      sets.push('display_order = @display_order')
      params.display_order = order
    }
    if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update')

    params.updated_at = toIsoNow()
    sets.push('updated_at = @updated_at')
    db.prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = @id`).run(params)

    const row = db
      .prepare('SELECT id, name, description, color, icon, display_order, created_at, updated_at FROM collections WHERE id = ?')
      .get(id)
    return { collection: mapCollectionRow(row) }
  })

  handleInvoke('collection:delete', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = db.prepare('SELECT id FROM collections WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Collection not found', { id })

    // Remove collection reference from projects (set to null)
    db.prepare('UPDATE projects SET collection_id = NULL WHERE collection_id = ?').run(id)
    db.prepare('DELETE FROM collections WHERE id = ?').run(id)

    return { deleted: true }
  })
}

module.exports = { registerCollectionsIpcHandlers }
