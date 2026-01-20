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

function hasOwn(obj, key) {
  return Boolean(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key))
}

function encodeJsonField(payload, key, options = {}) {
  if (!hasOwn(payload, key)) return { present: false, value: undefined }
  const raw = payload[key]
  if (raw === null) return { present: true, value: null }

  let json = null
  try {
    json = JSON.stringify(raw)
  } catch {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field: key })
  }

  if (typeof json !== 'string') {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field: key })
  }

  const maxBytes = typeof options.maxBytes === 'number' && options.maxBytes > 0 ? options.maxBytes : 64 * 1024
  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes > maxBytes) {
    throw createIpcError('INVALID_ARGUMENT', 'JSON field too large', { field: key, bytes, maxBytes })
  }

  return { present: true, value: json }
}

function decodeJsonField(raw) {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

function mapCharacterRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const projectId = typeof row?.project_id === 'string' ? row.project_id : ''
  const name = typeof row?.name === 'string' ? row.name : ''
  const description = typeof row?.description === 'string' ? row.description : null
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''

  return {
    id,
    projectId,
    name,
    description: description || undefined,
    traits: decodeJsonField(row?.traits),
    relationships: decodeJsonField(row?.relationships),
    createdAt,
    updatedAt,
  }
}

function registerCharactersIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('character:list', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')

    const rows = db
      .prepare(
        'SELECT id, project_id, name, description, traits, relationships, created_at, updated_at FROM characters WHERE project_id = ? ORDER BY updated_at DESC'
      )
      .all(projectId)
    return { characters: rows.map(mapCharacterRow).filter((c) => c.id && c.projectId && c.name) }
  })

  handleInvoke('character:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const name = coerceString(payload?.name)
    const description = coerceString(payload?.description) || null
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required')
    if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const projectExists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
    if (!projectExists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId })

    const traits = encodeJsonField(payload, 'traits')
    const relationships = encodeJsonField(payload, 'relationships')

    const id = randomUUID()
    const now = toIsoNow()
    db.prepare(
      'INSERT INTO characters (id, project_id, name, description, traits, relationships, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      projectId,
      name,
      description,
      traits.present ? traits.value : null,
      relationships.present ? relationships.value : null,
      now,
      now
    )

    const row = db
      .prepare('SELECT id, project_id, name, description, traits, relationships, created_at, updated_at FROM characters WHERE id = ?')
      .get(id)
    return { character: mapCharacterRow(row) }
  })

  handleInvoke('character:update', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = db.prepare('SELECT id FROM characters WHERE id = ? AND project_id = ?').get(id, projectId)
    if (!existing) throw createIpcError('NOT_FOUND', 'Character not found', { id, projectId })

    const name = typeof payload?.name === 'string' ? payload.name.trim() : undefined
    const description = typeof payload?.description === 'string' ? payload.description.trim() : undefined
    if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty')
    if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const traits = encodeJsonField(payload, 'traits')
    const relationships = encodeJsonField(payload, 'relationships')

    const sets = []
    const params = { id, project_id: projectId }

    if (typeof name === 'string') {
      sets.push('name = @name')
      params.name = name
    }
    if (typeof description === 'string') {
      sets.push('description = @description')
      params.description = description || null
    }
    if (traits.present) {
      sets.push('traits = @traits')
      params.traits = traits.value
    }
    if (relationships.present) {
      sets.push('relationships = @relationships')
      params.relationships = relationships.value
    }

    if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update')

    params.updated_at = toIsoNow()
    sets.push('updated_at = @updated_at')

    try {
      db.prepare(`UPDATE characters SET ${sets.join(', ')} WHERE id = @id AND project_id = @project_id`).run(params)
    } catch (error) {
      logger?.error?.('characters', 'update failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to update character', { message: error?.message })
    }

    const row = db
      .prepare('SELECT id, project_id, name, description, traits, relationships, created_at, updated_at FROM characters WHERE id = ?')
      .get(id)
    return { character: mapCharacterRow(row) }
  })

  handleInvoke('character:delete', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = db.prepare('SELECT id FROM characters WHERE id = ? AND project_id = ?').get(id, projectId)
    if (!existing) throw createIpcError('NOT_FOUND', 'Character not found', { id, projectId })

    db.prepare('DELETE FROM characters WHERE id = ? AND project_id = ?').run(id, projectId)
    return { deleted: true }
  })
}

module.exports = { registerCharactersIpcHandlers }

