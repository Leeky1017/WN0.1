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

  if (typeof json !== 'string') throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field: key })

  const maxBytes = typeof options.maxBytes === 'number' && options.maxBytes > 0 ? options.maxBytes : 256 * 1024
  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes > maxBytes) throw createIpcError('INVALID_ARGUMENT', 'JSON field too large', { field: key, bytes, maxBytes })

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

function mapEntityRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const projectId = typeof row?.project_id === 'string' ? row.project_id : ''
  const type = typeof row?.type === 'string' ? row.type : ''
  const name = typeof row?.name === 'string' ? row.name : ''
  const description = typeof row?.description === 'string' ? row.description : null
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''
  return {
    id,
    projectId,
    type,
    name,
    description: description || undefined,
    metadata: decodeJsonField(row?.metadata_json),
    createdAt,
    updatedAt,
  }
}

function mapRelationRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const projectId = typeof row?.project_id === 'string' ? row.project_id : ''
  const fromEntityId = typeof row?.from_entity_id === 'string' ? row.from_entity_id : ''
  const toEntityId = typeof row?.to_entity_id === 'string' ? row.to_entity_id : ''
  const type = typeof row?.type === 'string' ? row.type : ''
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''
  return {
    id,
    projectId,
    fromEntityId,
    toEntityId,
    type,
    metadata: decodeJsonField(row?.metadata_json),
    createdAt,
    updatedAt,
  }
}

function assertProjectExists(db, projectId) {
  const row = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
  if (!row) throw createIpcError('NOT_FOUND', 'Project not found', { projectId })
}

function assertEntityExists(db, projectId, entityId) {
  const row = db.prepare('SELECT id FROM kg_entities WHERE id = ? AND project_id = ?').get(entityId, projectId)
  if (!row) throw createIpcError('NOT_FOUND', 'Entity not found', { projectId, entityId })
}

function registerKnowledgeGraphIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('kg:graph:get', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')

    const entities = db
      .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE project_id = ?')
      .all(projectId)
      .map(mapEntityRow)
      .filter((e) => e.id && e.projectId && e.name && e.type)

    const relations = db
      .prepare(
        'SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE project_id = ?'
      )
      .all(projectId)
      .map(mapRelationRow)
      .filter((r) => r.id && r.projectId && r.fromEntityId && r.toEntityId && r.type)

    return { entities, relations }
  })

  handleInvoke('kg:entity:list', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const rows = db
      .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE project_id = ? ORDER BY updated_at DESC')
      .all(projectId)
    return { entities: rows.map(mapEntityRow).filter((e) => e.id && e.projectId && e.name && e.type) }
  })

  handleInvoke('kg:entity:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const type = coerceString(payload?.type)
    const name = coerceString(payload?.name)
    const description = coerceString(payload?.description) || null
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!type) throw createIpcError('INVALID_ARGUMENT', 'type is required')
    if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required')
    if (type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 })
    if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    assertProjectExists(db, projectId)

    const metadata = encodeJsonField(payload, 'metadata')

    const id = randomUUID()
    const now = toIsoNow()
    db.prepare(
      'INSERT INTO kg_entities (id, project_id, type, name, description, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, type, name, description, metadata.present ? metadata.value : null, now, now)

    const row = db
      .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE id = ?')
      .get(id)
    return { entity: mapEntityRow(row) }
  })

  handleInvoke('kg:entity:update', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    assertEntityExists(db, projectId, id)

    const type = typeof payload?.type === 'string' ? payload.type.trim() : undefined
    const name = typeof payload?.name === 'string' ? payload.name.trim() : undefined
    const description = typeof payload?.description === 'string' ? payload.description.trim() : undefined
    if (typeof type === 'string' && !type) throw createIpcError('INVALID_ARGUMENT', 'type cannot be empty')
    if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty')
    if (typeof type === 'string' && type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 })
    if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const metadata = encodeJsonField(payload, 'metadata')

    const sets = []
    const params = { id, project_id: projectId }
    if (typeof type === 'string') {
      sets.push('type = @type')
      params.type = type
    }
    if (typeof name === 'string') {
      sets.push('name = @name')
      params.name = name
    }
    if (typeof description === 'string') {
      sets.push('description = @description')
      params.description = description || null
    }
    if (metadata.present) {
      sets.push('metadata_json = @metadata_json')
      params.metadata_json = metadata.value
    }
    if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update')

    params.updated_at = toIsoNow()
    sets.push('updated_at = @updated_at')

    try {
      db.prepare(`UPDATE kg_entities SET ${sets.join(', ')} WHERE id = @id AND project_id = @project_id`).run(params)
    } catch (error) {
      logger?.error?.('kg', 'entity update failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to update entity', { message: error?.message })
    }

    const row = db
      .prepare('SELECT id, project_id, type, name, description, metadata_json, created_at, updated_at FROM kg_entities WHERE id = ?')
      .get(id)
    return { entity: mapEntityRow(row) }
  })

  handleInvoke('kg:entity:delete', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    assertEntityExists(db, projectId, id)
    db.prepare('DELETE FROM kg_entities WHERE id = ? AND project_id = ?').run(id, projectId)
    return { deleted: true }
  })

  handleInvoke('kg:relation:list', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const entityId = coerceString(payload?.entityId) || null

    const rows = entityId
      ? db
          .prepare(
            `SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at
             FROM kg_relations
             WHERE project_id = ? AND (from_entity_id = ? OR to_entity_id = ?)
             ORDER BY updated_at DESC`
          )
          .all(projectId, entityId, entityId)
      : db
          .prepare(
            'SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE project_id = ? ORDER BY updated_at DESC'
          )
          .all(projectId)

    return { relations: rows.map(mapRelationRow).filter((r) => r.id && r.projectId && r.fromEntityId && r.toEntityId && r.type) }
  })

  handleInvoke('kg:relation:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const fromEntityId = coerceString(payload?.fromEntityId)
    const toEntityId = coerceString(payload?.toEntityId)
    const type = coerceString(payload?.type)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!fromEntityId) throw createIpcError('INVALID_ARGUMENT', 'fromEntityId is required')
    if (!toEntityId) throw createIpcError('INVALID_ARGUMENT', 'toEntityId is required')
    if (!type) throw createIpcError('INVALID_ARGUMENT', 'type is required')
    if (fromEntityId === toEntityId) throw createIpcError('INVALID_ARGUMENT', 'fromEntityId and toEntityId cannot be the same')
    if (type.length > 60) throw createIpcError('INVALID_ARGUMENT', 'type is too long', { max: 60 })

    assertProjectExists(db, projectId)
    assertEntityExists(db, projectId, fromEntityId)
    assertEntityExists(db, projectId, toEntityId)

    const metadata = encodeJsonField(payload, 'metadata')
    const id = randomUUID()
    const now = toIsoNow()
    db.prepare(
      'INSERT INTO kg_relations (id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, fromEntityId, toEntityId, type, metadata.present ? metadata.value : null, now, now)

    const row = db
      .prepare('SELECT id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at FROM kg_relations WHERE id = ?')
      .get(id)
    return { relation: mapRelationRow(row) }
  })

  handleInvoke('kg:relation:delete', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = db.prepare('SELECT id FROM kg_relations WHERE id = ? AND project_id = ?').get(id, projectId)
    if (!existing) throw createIpcError('NOT_FOUND', 'Relation not found', { projectId, id })

    db.prepare('DELETE FROM kg_relations WHERE id = ? AND project_id = ?').run(id, projectId)
    return { deleted: true }
  })
}

module.exports = { registerKnowledgeGraphIpcHandlers }

