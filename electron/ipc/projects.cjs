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

function deserializeSettingValue(raw) {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? deserializeSettingValue(row.value) : null
}

function setSetting(db, key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value))
}

function mapProjectRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const name = typeof row?.name === 'string' ? row.name : ''
  const description = typeof row?.description === 'string' ? row.description : null
  const styleGuide = typeof row?.style_guide === 'string' ? row.style_guide : null
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''
  return {
    id,
    name,
    description: description || undefined,
    styleGuide: styleGuide || undefined,
    createdAt,
    updatedAt,
  }
}

function listProjects(db) {
  const rows = db
    .prepare('SELECT id, name, description, style_guide, created_at, updated_at FROM projects ORDER BY updated_at DESC')
    .all()
  return rows.map(mapProjectRow).filter((p) => p.id && p.name)
}

function resolveCurrentProjectId(db, projects) {
  const stored = getSetting(db, 'current_project_id')
  const storedId = typeof stored === 'string' ? stored.trim() : ''
  if (storedId && projects.some((p) => p.id === storedId)) return storedId
  const fallback = projects.length > 0 ? projects[0].id : null
  if (fallback) setSetting(db, 'current_project_id', fallback)
  return fallback
}

function ensureDefaultProject(db) {
  const existing = listProjects(db)
  if (existing.length > 0) return { created: false, projects: existing }

  const id = randomUUID()
  const now = toIsoNow()
  db.prepare('INSERT INTO projects (id, name, description, style_guide, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    '默认项目',
    null,
    null,
    now,
    now
  )
  setSetting(db, 'current_project_id', id)
  return { created: true, projects: listProjects(db) }
}

function bootstrapProjects(db) {
  const ensured = ensureDefaultProject(db)
  const projects = ensured.projects
  const currentProjectId = resolveCurrentProjectId(db, projects)
  if (!currentProjectId) throw createIpcError('DB_ERROR', 'Failed to resolve current project')

  const migrated = db
    .prepare("UPDATE articles SET project_id = ? WHERE project_id IS NULL AND id LIKE '%.md'")
    .run(currentProjectId)
  return {
    createdDefault: ensured.created,
    currentProjectId,
    migratedArticles: migrated?.changes ?? 0,
  }
}

function registerProjectsIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('project:bootstrap', async () => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    try {
      return bootstrapProjects(db)
    } catch (error) {
      if (error?.ipcError?.code) throw error
      logger?.error?.('projects', 'bootstrap failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to bootstrap projects', { message: error?.message })
    }
  })

  handleInvoke('project:list', async () => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    return { projects: listProjects(db) }
  })

  handleInvoke('project:getCurrent', async () => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projects = listProjects(db)
    const currentProjectId = resolveCurrentProjectId(db, projects)
    return { projectId: currentProjectId }
  })

  handleInvoke('project:setCurrent', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
    if (!exists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId })
    setSetting(db, 'current_project_id', projectId)
    return { projectId }
  })

  handleInvoke('project:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const name = coerceString(payload?.name)
    const description = coerceString(payload?.description) || null
    const styleGuide = coerceString(payload?.styleGuide) || null
    if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required')
    if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const id = randomUUID()
    const now = toIsoNow()
    db.prepare('INSERT INTO projects (id, name, description, style_guide, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      name,
      description,
      styleGuide,
      now,
      now
    )

    setSetting(db, 'current_project_id', id)
    const row = db
      .prepare('SELECT id, name, description, style_guide, created_at, updated_at FROM projects WHERE id = ?')
      .get(id)
    return { project: mapProjectRow(row), currentProjectId: id }
  })

  handleInvoke('project:update', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const name = typeof payload?.name === 'string' ? payload.name.trim() : undefined
    const description = typeof payload?.description === 'string' ? payload.description.trim() : undefined
    const styleGuide = typeof payload?.styleGuide === 'string' ? payload.styleGuide.trim() : undefined
    if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty')
    if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Project not found', { id })

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
    if (typeof styleGuide === 'string') {
      sets.push('style_guide = @style_guide')
      params.style_guide = styleGuide || null
    }
    if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update')

    params.updated_at = toIsoNow()
    sets.push('updated_at = @updated_at')
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params)

    const row = db
      .prepare('SELECT id, name, description, style_guide, created_at, updated_at FROM projects WHERE id = ?')
      .get(id)
    return { project: mapProjectRow(row) }
  })

  handleInvoke('project:delete', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Project not found', { id })

    const projects = listProjects(db).filter((p) => p.id !== id)
    if (projects.length === 0) {
      throw createIpcError('CONFLICT', 'Cannot delete the last project')
    }

    const requestedReassign = coerceString(payload?.reassignProjectId)
    const fallbackProjectId =
      requestedReassign && projects.some((p) => p.id === requestedReassign) ? requestedReassign : projects[0].id

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM characters WHERE project_id = ?').run(id)
      db.prepare('DELETE FROM outlines WHERE project_id = ?').run(id)
      db.prepare('DELETE FROM kg_relations WHERE project_id = ?').run(id)
      db.prepare('DELETE FROM kg_entities WHERE project_id = ?').run(id)
      db.prepare('DELETE FROM writing_constraints WHERE project_id = ?').run(id)
      db.prepare('DELETE FROM terminology WHERE project_id = ?').run(id)
      db.prepare('DELETE FROM forbidden_words WHERE project_id = ?').run(id)
      db.prepare('UPDATE articles SET project_id = ? WHERE project_id = ?').run(fallbackProjectId, id)
      db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    })
    tx()

    const current = getSetting(db, 'current_project_id')
    const currentId = typeof current === 'string' ? current.trim() : ''
    if (currentId === id) {
      setSetting(db, 'current_project_id', fallbackProjectId)
    }

    return { deleted: true, currentProjectId: fallbackProjectId }
  })
}

module.exports = { registerProjectsIpcHandlers }
