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
 * Normalizes a project status value.
 * Valid statuses: 'draft', 'published', 'archived'
 * @param {unknown} value - The value to normalize
 * @returns {string} - The normalized status (defaults to 'draft')
 */
function normalizeProjectStatus(value) {
  const raw = coerceString(value)
  if (raw === 'published' || raw === 'archived') return raw
  return 'draft'
}

/**
 * Normalizes a tags array.
 * @param {unknown} value - The value to normalize
 * @returns {string[]} - The normalized tags array
 */
function normalizeTags(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= 50)
    .slice(0, 20) // Max 20 tags
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

/**
 * Maps a database row to a Project object.
 * Includes extended fields: status, coverImage, tags, wordCount, featured, collectionId.
 * @param {object|null} row - The database row
 * @returns {object} - The normalized project object
 */
function mapProjectRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const name = typeof row?.name === 'string' ? row.name : ''
  const description = typeof row?.description === 'string' ? row.description : null
  const styleGuide = typeof row?.style_guide === 'string' ? row.style_guide : null
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''
  // Extended fields for P9-01
  const status = typeof row?.status === 'string' ? row.status : 'draft'
  const coverImage = typeof row?.cover_image === 'string' ? row.cover_image : null
  const tagsRaw = typeof row?.tags === 'string' ? row.tags : null
  const tags = tagsRaw ? parseJsonArray(tagsRaw) : []
  const wordCount = typeof row?.word_count === 'number' ? row.word_count : 0
  const featured = row?.featured === 1
  const collectionId = typeof row?.collection_id === 'string' ? row.collection_id : null
  return {
    id,
    name,
    description: description || undefined,
    styleGuide: styleGuide || undefined,
    // Extended fields
    status,
    coverImage: coverImage || undefined,
    tags,
    wordCount,
    featured,
    collectionId: collectionId || undefined,
    createdAt,
    updatedAt,
  }
}

/**
 * Safely parses a JSON array string.
 * @param {string} raw - The raw JSON string
 * @returns {string[]} - The parsed array or empty array
 */
function parseJsonArray(raw) {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

/**
 * Lists all projects with extended fields.
 * @param {object} db - The better-sqlite3 database instance
 * @returns {object[]} - Array of project objects
 */
function listProjects(db) {
  const rows = db
    .prepare(
      `SELECT id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at 
       FROM projects 
       ORDER BY updated_at DESC`
    )
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

/**
 * Ensures a default project exists; creates one if needed.
 * Initializes with default extended field values.
 * @param {object} db - The better-sqlite3 database instance
 * @returns {object} - Result with created flag and projects list
 */
function ensureDefaultProject(db) {
  const existing = listProjects(db)
  if (existing.length > 0) return { created: false, projects: existing }

  const id = randomUUID()
  const now = toIsoNow()
  db.prepare(
    `INSERT INTO projects (id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, '默认项目', null, null, 'draft', null, '[]', 0, 0, null, now, now)
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
  const onCurrentProjectId = typeof options.onCurrentProjectId === 'function' ? options.onCurrentProjectId : null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('project:bootstrap', async () => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    try {
      const result = bootstrapProjects(db)
      try {
        await onCurrentProjectId?.(result.currentProjectId)
      } catch (error) {
        logger?.warn?.('projects', 'project bootstrap hook failed', { message: error?.message })
      }
      return result
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
    try {
      await onCurrentProjectId?.(projectId)
    } catch (error) {
      logger?.warn?.('projects', 'project setCurrent hook failed', { message: error?.message })
    }
    return { projectId }
  })

  handleInvoke('project:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const name = coerceString(payload?.name)
    const description = coerceString(payload?.description) || null
    const styleGuide = coerceString(payload?.styleGuide) || null
    if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required')
    if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    // Extended fields (P9-01)
    const status = normalizeProjectStatus(payload?.status)
    const coverImage = coerceString(payload?.coverImage) || null
    const tags = normalizeTags(payload?.tags)
    const featured = payload?.featured === true ? 1 : 0
    const collectionId = coerceString(payload?.collectionId) || null

    // Validate collectionId if provided
    if (collectionId) {
      const collection = db.prepare('SELECT 1 FROM collections WHERE id = ?').get(collectionId)
      if (!collection) throw createIpcError('NOT_FOUND', 'Collection not found', { collectionId })
    }

    const id = randomUUID()
    const now = toIsoNow()
    db.prepare(
      `INSERT INTO projects (id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, description, styleGuide, status, coverImage, JSON.stringify(tags), 0, featured, collectionId, now, now)

    setSetting(db, 'current_project_id', id)
    try {
      await onCurrentProjectId?.(id)
    } catch (error) {
      logger?.warn?.('projects', 'project create hook failed', { message: error?.message })
    }
    const row = db
      .prepare('SELECT id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at FROM projects WHERE id = ?')
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

    // Extended fields (P9-01)
    const status = typeof payload?.status === 'string' ? normalizeProjectStatus(payload.status) : undefined
    const coverImage = typeof payload?.coverImage === 'string' ? payload.coverImage.trim() : undefined
    const tags = Array.isArray(payload?.tags) ? normalizeTags(payload.tags) : undefined
    const wordCount = typeof payload?.wordCount === 'number' && Number.isFinite(payload.wordCount) ? Math.max(0, Math.floor(payload.wordCount)) : undefined
    const featured = typeof payload?.featured === 'boolean' ? payload.featured : undefined
    const collectionId = Object.prototype.hasOwnProperty.call(payload ?? {}, 'collectionId')
      ? (payload.collectionId === null ? null : coerceString(payload.collectionId) || null)
      : undefined

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Project not found', { id })

    // Validate collectionId if provided
    if (typeof collectionId === 'string' && collectionId) {
      const collection = db.prepare('SELECT 1 FROM collections WHERE id = ?').get(collectionId)
      if (!collection) throw createIpcError('NOT_FOUND', 'Collection not found', { collectionId })
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
    if (typeof styleGuide === 'string') {
      sets.push('style_guide = @style_guide')
      params.style_guide = styleGuide || null
    }
    // Extended fields
    if (typeof status === 'string') {
      sets.push('status = @status')
      params.status = status
    }
    if (typeof coverImage === 'string') {
      sets.push('cover_image = @cover_image')
      params.cover_image = coverImage || null
    }
    if (Array.isArray(tags)) {
      sets.push('tags = @tags')
      params.tags = JSON.stringify(tags)
    }
    if (typeof wordCount === 'number') {
      sets.push('word_count = @word_count')
      params.word_count = wordCount
    }
    if (typeof featured === 'boolean') {
      sets.push('featured = @featured')
      params.featured = featured ? 1 : 0
    }
    if (collectionId !== undefined) {
      sets.push('collection_id = @collection_id')
      params.collection_id = collectionId
    }
    if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update')

    params.updated_at = toIsoNow()
    sets.push('updated_at = @updated_at')
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params)

    const row = db
      .prepare('SELECT id, name, description, style_guide, status, cover_image, tags, word_count, featured, collection_id, created_at, updated_at FROM projects WHERE id = ?')
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

    try {
      await onCurrentProjectId?.(fallbackProjectId)
    } catch (error) {
      logger?.warn?.('projects', 'project delete hook failed', { message: error?.message })
    }
    return { deleted: true, currentProjectId: fallbackProjectId }
  })
}

module.exports = { registerProjectsIpcHandlers }
