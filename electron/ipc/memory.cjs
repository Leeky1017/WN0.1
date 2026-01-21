const { createHash, randomUUID } = require('node:crypto')

const DEFAULT_SETTINGS = Object.freeze({
  injectionEnabled: true,
  preferenceLearningEnabled: true,
  privacyModeEnabled: false,
  preferenceLearningThreshold: 3,
})

const SETTINGS_KEYS = Object.freeze({
  injectionEnabled: 'memory.injectionEnabled',
  preferenceLearningEnabled: 'preferenceLearning.enabled',
  privacyModeEnabled: 'privacyMode.enabled',
  preferenceLearningThreshold: 'preferenceLearning.threshold',
  preferenceLearningCounts: 'preferenceLearning.counts.v1',
})

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

function toBooleanOrUndefined(value) {
  if (typeof value === 'boolean') return value
  return undefined
}

function toNumberOrUndefined(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

function normalizeMemoryType(value) {
  const raw = coerceString(value)
  if (raw === 'preference' || raw === 'feedback' || raw === 'style') return raw
  return ''
}

function mapOrigin(id) {
  return typeof id === 'string' && id.startsWith('learned:') ? 'learned' : 'manual'
}

function mapMemoryRow(row) {
  const id = typeof row?.id === 'string' ? row.id : ''
  const type = normalizeMemoryType(row?.type)
  const content = typeof row?.content === 'string' ? row.content : ''
  const projectId = typeof row?.project_id === 'string' ? row.project_id : null
  const createdAt = typeof row?.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row?.updated_at === 'string' ? row.updated_at : ''

  return {
    id,
    type,
    content,
    projectId,
    origin: mapOrigin(id),
    createdAt,
    updatedAt,
  }
}

function assertDb(db) {
  if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
  return db
}

function assertConfig(config) {
  if (!config || typeof config.get !== 'function' || typeof config.set !== 'function') {
    throw createIpcError('INTERNAL', 'Config is not available')
  }
  return config
}

function normalizeSettings(raw) {
  const obj = raw && typeof raw === 'object' ? raw : null
  return {
    injectionEnabled: typeof obj?.injectionEnabled === 'boolean' ? obj.injectionEnabled : DEFAULT_SETTINGS.injectionEnabled,
    preferenceLearningEnabled:
      typeof obj?.preferenceLearningEnabled === 'boolean' ? obj.preferenceLearningEnabled : DEFAULT_SETTINGS.preferenceLearningEnabled,
    privacyModeEnabled: typeof obj?.privacyModeEnabled === 'boolean' ? obj.privacyModeEnabled : DEFAULT_SETTINGS.privacyModeEnabled,
    preferenceLearningThreshold:
      typeof obj?.preferenceLearningThreshold === 'number' && Number.isFinite(obj.preferenceLearningThreshold) && obj.preferenceLearningThreshold > 0
        ? Math.min(20, Math.floor(obj.preferenceLearningThreshold))
        : DEFAULT_SETTINGS.preferenceLearningThreshold,
  }
}

function readSettings(config) {
  const cfg = assertConfig(config)
  return normalizeSettings({
    injectionEnabled: cfg.get(SETTINGS_KEYS.injectionEnabled),
    preferenceLearningEnabled: cfg.get(SETTINGS_KEYS.preferenceLearningEnabled),
    privacyModeEnabled: cfg.get(SETTINGS_KEYS.privacyModeEnabled),
    preferenceLearningThreshold: cfg.get(SETTINGS_KEYS.preferenceLearningThreshold),
  })
}

function writeSettings(config, patch) {
  const cfg = assertConfig(config)
  const current = readSettings(cfg)

  const injectionEnabled = toBooleanOrUndefined(patch?.injectionEnabled)
  const preferenceLearningEnabled = toBooleanOrUndefined(patch?.preferenceLearningEnabled)
  const privacyModeEnabled = toBooleanOrUndefined(patch?.privacyModeEnabled)
  const threshold = toNumberOrUndefined(patch?.preferenceLearningThreshold)

  const next = normalizeSettings({
    injectionEnabled: typeof injectionEnabled === 'boolean' ? injectionEnabled : current.injectionEnabled,
    preferenceLearningEnabled: typeof preferenceLearningEnabled === 'boolean' ? preferenceLearningEnabled : current.preferenceLearningEnabled,
    privacyModeEnabled: typeof privacyModeEnabled === 'boolean' ? privacyModeEnabled : current.privacyModeEnabled,
    preferenceLearningThreshold: typeof threshold === 'number' ? threshold : current.preferenceLearningThreshold,
  })

  cfg.set(SETTINGS_KEYS.injectionEnabled, next.injectionEnabled)
  cfg.set(SETTINGS_KEYS.preferenceLearningEnabled, next.preferenceLearningEnabled)
  cfg.set(SETTINGS_KEYS.privacyModeEnabled, next.privacyModeEnabled)
  cfg.set(SETTINGS_KEYS.preferenceLearningThreshold, next.preferenceLearningThreshold)

  return next
}

function normalizeCounts(raw) {
  const obj = raw && typeof raw === 'object' ? raw : null
  const version = obj?.version === 1 ? 1 : 1
  const accepted = obj?.accepted && typeof obj.accepted === 'object' ? obj.accepted : {}
  const rejected = obj?.rejected && typeof obj.rejected === 'object' ? obj.rejected : {}
  const acceptedCounts = {}
  const rejectedCounts = {}

  for (const [key, value] of Object.entries(accepted)) {
    if (typeof key !== 'string') continue
    const n = typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
    if (n > 0) acceptedCounts[key] = Math.min(9999, n)
  }
  for (const [key, value] of Object.entries(rejected)) {
    if (typeof key !== 'string') continue
    const n = typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
    if (n > 0) rejectedCounts[key] = Math.min(9999, n)
  }

  return { version, accepted: acceptedCounts, rejected: rejectedCounts, updatedAt: toIsoNow() }
}

function loadCounts(config) {
  const cfg = assertConfig(config)
  return normalizeCounts(cfg.get(SETTINGS_KEYS.preferenceLearningCounts))
}

function saveCounts(config, counts) {
  const cfg = assertConfig(config)
  cfg.set(SETTINGS_KEYS.preferenceLearningCounts, counts)
}

function normalizeSignal(raw) {
  const text = coerceString(raw)
  if (!text) return ''
  if (text.length > 240) return `${text.slice(0, 239)}…`
  return text.replace(/\s+/g, ' ')
}

function isNoiseSignal(signal) {
  if (!signal) return true
  if (signal.startsWith('skill:')) return true
  return false
}

function hashId(input) {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function formatLearnedPreference(kind, signal) {
  if (kind === 'accepted') return signal
  const lowered = signal.toLowerCase()
  const hasNegation =
    lowered.includes('不要') || lowered.includes('避免') || lowered.includes('不喜欢') || lowered.includes('少用') || lowered.includes('禁止')
  return hasNegation ? signal : `避免：${signal}`
}

function ensureProjectExists(db, projectId) {
  const pid = coerceString(projectId)
  if (!pid) return
  const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(pid)
  if (!exists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId: pid })
}

function buildListQuery(payload) {
  const projectId = coerceString(payload?.projectId)
  const includeGlobal = payload?.includeGlobal !== false
  const includeLearned = payload?.includeLearned !== false

  const scopeRaw = coerceString(payload?.scope)
  const scope = scopeRaw === 'global' || scopeRaw === 'project' || scopeRaw === 'all' ? scopeRaw : 'all'

  const type = normalizeMemoryType(payload?.type)

  const limitRaw = payload?.limit
  const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 200

  const clauses = []
  const params = {}

  if (scope === 'global') {
    clauses.push('project_id IS NULL')
  } else if (scope === 'project') {
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required for scope=project')
    clauses.push('project_id = @project_id')
    params.project_id = projectId
  } else if (projectId && includeGlobal) {
    clauses.push('(project_id IS NULL OR project_id = @project_id)')
    params.project_id = projectId
  } else if (projectId) {
    clauses.push('project_id = @project_id')
    params.project_id = projectId
  } else {
    clauses.push('project_id IS NULL')
  }

  if (type) {
    clauses.push('type = @type')
    params.type = type
  }

  if (!includeLearned) {
    clauses.push("id NOT LIKE 'learned:%'")
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

  return {
    sql: `SELECT id, type, content, project_id, created_at, updated_at FROM user_memory ${where} ORDER BY updated_at DESC, created_at DESC LIMIT ${limit}`,
    params,
  }
}

function clampText(text, maxChars) {
  const value = typeof text === 'string' ? text.trim() : ''
  if (maxChars <= 0) return ''
  if (value.length <= maxChars) return value
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`
}

function getTypeOrder(type) {
  if (type === 'preference') return 1
  if (type === 'style') return 2
  if (type === 'feedback') return 3
  return 99
}

function getScopeOrder(projectId) {
  return projectId ? 1 : 2
}

function getOriginOrder(id) {
  return mapOrigin(id) === 'manual' ? 1 : 2
}

/**
 * Selects `user_memory` items for AI injection.
 * Why: keep injection minimal + ordered + privacy-aware, and share the same selection logic between preview and AI runs.
 */
function selectMemoryForInjection(input) {
  const database = assertDb(input?.db)
  const projectId = coerceString(input?.projectId)
  const settings = readSettings(input?.config)

  const maxItems = typeof input?.maxItems === 'number' && Number.isFinite(input.maxItems) && input.maxItems > 0 ? Math.min(50, Math.floor(input.maxItems)) : 12
  const maxChars = typeof input?.maxChars === 'number' && Number.isFinite(input.maxChars) && input.maxChars > 0 ? Math.min(20_000, Math.floor(input.maxChars)) : 1800
  const maxCharsPerItem =
    typeof input?.maxCharsPerItem === 'number' && Number.isFinite(input.maxCharsPerItem) && input.maxCharsPerItem > 0
      ? Math.min(5000, Math.floor(input.maxCharsPerItem))
      : 360

  if (!settings.injectionEnabled) {
    return { settings, items: [], usedChars: 0, limits: { maxItems, maxChars, maxCharsPerItem } }
  }

  const clauses = []
  const params = {}

  if (projectId) {
    clauses.push('(project_id IS NULL OR project_id = @project_id)')
    params.project_id = projectId
  } else {
    clauses.push('project_id IS NULL')
  }

  if (settings.privacyModeEnabled) {
    clauses.push("id NOT LIKE 'learned:%'")
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = database
    .prepare(`SELECT id, type, content, project_id, created_at, updated_at FROM user_memory ${where} ORDER BY updated_at DESC LIMIT 500`)
    .all(params)

  const candidates = rows
    .map(mapMemoryRow)
    .filter((item) => item.id && item.type && typeof item.content === 'string' && item.content.trim())

  candidates.sort((a, b) => {
    const typeA = getTypeOrder(a.type)
    const typeB = getTypeOrder(b.type)
    if (typeA !== typeB) return typeA - typeB

    const scopeA = getScopeOrder(a.projectId)
    const scopeB = getScopeOrder(b.projectId)
    if (scopeA !== scopeB) return scopeA - scopeB

    const originA = getOriginOrder(a.id)
    const originB = getOriginOrder(b.id)
    if (originA !== originB) return originA - originB

    if (a.updatedAt !== b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt)
    if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt)
    return a.id.localeCompare(b.id)
  })

  const kept = []
  let usedChars = 0
  for (const item of candidates) {
    if (kept.length >= maxItems) break
    const nextContent = clampText(item.content, maxCharsPerItem)
    if (!nextContent) continue

    const nextUsed = usedChars + nextContent.length
    if (kept.length > 0 && nextUsed > maxChars) break
    kept.push({ ...item, content: nextContent })
    usedChars = nextUsed
  }

  return { settings, items: kept, usedChars, limits: { maxItems, maxChars, maxCharsPerItem } }
}

function registerMemoryIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const config = options.config ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('memory:list', async (_evt, payload) => {
    const database = assertDb(db)
    const query = buildListQuery(payload)
    const rows = database.prepare(query.sql).all(query.params)
    return { items: rows.map(mapMemoryRow).filter((item) => item.id && item.type && item.content) }
  })

  handleInvoke('memory:settings:get', async () => {
    const settings = readSettings(config)
    return { settings }
  })

  handleInvoke('memory:settings:update', async (_evt, payload) => {
    const settings = writeSettings(config, payload)
    return { settings }
  })

  handleInvoke('memory:injection:preview', async (_evt, payload) => {
    const database = assertDb(db)
    const projectId = coerceString(payload?.projectId)
    if (projectId) ensureProjectExists(database, projectId)

    const selection = selectMemoryForInjection({ db: database, config, projectId })
    return { settings: selection.settings, injected: { memory: selection.items } }
  })

  handleInvoke('memory:create', async (_evt, payload) => {
    const database = assertDb(db)
    const type = normalizeMemoryType(payload?.type)
    if (!type) throw createIpcError('INVALID_ARGUMENT', 'type is required')

    const content = coerceString(payload?.content)
    if (!content) throw createIpcError('INVALID_ARGUMENT', 'content is required')
    if (content.length > 10_000) throw createIpcError('INVALID_ARGUMENT', 'content is too long', { max: 10_000 })

    const projectIdRaw = payload?.projectId
    const projectId = projectIdRaw === null ? null : coerceString(projectIdRaw)
    if (projectId) ensureProjectExists(database, projectId)

    const id = randomUUID()
    const now = toIsoNow()
    database
      .prepare('INSERT INTO user_memory (id, type, content, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, type, content, projectId || null, now, now)

    const row = database
      .prepare('SELECT id, type, content, project_id, created_at, updated_at FROM user_memory WHERE id = ?')
      .get(id)
    return { item: mapMemoryRow(row) }
  })

  handleInvoke('memory:update', async (_evt, payload) => {
    const database = assertDb(db)
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = database.prepare('SELECT id FROM user_memory WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Memory item not found', { id })

    const typeRaw = payload?.type
    const nextType = typeof typeRaw === 'undefined' ? undefined : normalizeMemoryType(typeRaw)
    if (typeof typeRaw !== 'undefined' && !nextType) throw createIpcError('INVALID_ARGUMENT', 'Invalid type', { type: typeRaw })

    const contentRaw = payload?.content
    const nextContent = typeof contentRaw === 'undefined' ? undefined : coerceString(contentRaw)
    if (typeof contentRaw !== 'undefined' && !nextContent) throw createIpcError('INVALID_ARGUMENT', 'content cannot be empty')
    if (typeof nextContent === 'string' && nextContent.length > 10_000) {
      throw createIpcError('INVALID_ARGUMENT', 'content is too long', { max: 10_000 })
    }

    let projectId = undefined
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, 'projectId')) {
      const raw = payload?.projectId
      projectId = raw === null ? null : coerceString(raw)
      if (projectId) ensureProjectExists(database, projectId)
    }

    const sets = []
    const params = { id }
    if (typeof nextType === 'string') {
      sets.push('type = @type')
      params.type = nextType
    }
    if (typeof nextContent === 'string') {
      sets.push('content = @content')
      params.content = nextContent
    }
    if (typeof projectId !== 'undefined') {
      sets.push('project_id = @project_id')
      params.project_id = projectId
    }

    if (sets.length === 0) throw createIpcError('INVALID_ARGUMENT', 'No fields to update')

    params.updated_at = toIsoNow()
    sets.push('updated_at = @updated_at')

    try {
      database.prepare(`UPDATE user_memory SET ${sets.join(', ')} WHERE id = @id`).run(params)
    } catch (error) {
      logger?.error?.('memory', 'update failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to update memory item', { message: error?.message })
    }

    const row = database.prepare('SELECT id, type, content, project_id, created_at, updated_at FROM user_memory WHERE id = ?').get(id)
    return { item: mapMemoryRow(row) }
  })

  handleInvoke('memory:delete', async (_evt, payload) => {
    const database = assertDb(db)
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existing = database.prepare('SELECT id FROM user_memory WHERE id = ?').get(id)
    if (!existing) throw createIpcError('NOT_FOUND', 'Memory item not found', { id })

    database.prepare('DELETE FROM user_memory WHERE id = ?').run(id)
    return { deleted: true }
  })

  /**
   * Ingests preference signals and materializes learned `user_memory(type=preference)`.
   * Why: keep learning local + auditable, while allowing UI to surface undo/disable/privacy controls.
   */
  handleInvoke('memory:preferences:ingest', async (_evt, payload) => {
    const database = assertDb(db)
    const settings = readSettings(config)
    if (!settings.preferenceLearningEnabled) {
      return { learned: [], ignored: 0, settings }
    }
    if (settings.privacyModeEnabled) {
      return { learned: [], ignored: 0, settings }
    }

    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    ensureProjectExists(database, projectId)

    const signals = payload?.signals
    const acceptedRaw = Array.isArray(signals?.accepted) ? signals.accepted : []
    const rejectedRaw = Array.isArray(signals?.rejected) ? signals.rejected : []

    const acceptedSet = new Set(acceptedRaw.map(normalizeSignal).filter(Boolean))
    const rejectedSet = new Set(rejectedRaw.map(normalizeSignal).filter(Boolean))

    for (const s of acceptedSet) {
      if (rejectedSet.has(s)) {
        acceptedSet.delete(s)
        rejectedSet.delete(s)
      }
    }

    const accepted = Array.from(acceptedSet).filter((s) => !isNoiseSignal(s))
    const rejected = Array.from(rejectedSet).filter((s) => !isNoiseSignal(s))
    const ignored = acceptedRaw.length + rejectedRaw.length - accepted.length - rejected.length

    if (accepted.length === 0 && rejected.length === 0) {
      return { learned: [], ignored, settings }
    }

    const counts = loadCounts(config)

    const threshold = settings.preferenceLearningThreshold
    const learned = []
    const now = toIsoNow()

    const maybeCreate = (kind, signal) => {
      const content = formatLearnedPreference(kind, signal)
      const stable = hashId(`${kind}:${signal}`)
      const id = `learned:pref:${stable}`

      const exists = database.prepare('SELECT 1 FROM user_memory WHERE id = ?').get(id)
      if (exists) return null

      database
        .prepare('INSERT INTO user_memory (id, type, content, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, 'preference', content, null, now, now)

      const row = database.prepare('SELECT id, type, content, project_id, created_at, updated_at FROM user_memory WHERE id = ?').get(id)
      const item = mapMemoryRow(row)
      if (item.id) learned.push(item)
      return item
    }

    for (const signal of accepted) {
      const next = (counts.accepted[signal] ?? 0) + 1
      counts.accepted[signal] = next
      if (next === threshold) maybeCreate('accepted', signal)
    }

    for (const signal of rejected) {
      const next = (counts.rejected[signal] ?? 0) + 1
      counts.rejected[signal] = next
      if (next === threshold) maybeCreate('rejected', signal)
    }

    saveCounts(config, counts)
    logger?.info?.('memory', 'preferences ingested', { learned: learned.length, ignored, threshold })

    return { learned, ignored, settings }
  })

  handleInvoke('memory:preferences:clear', async (_evt, payload) => {
    const database = assertDb(db)
    const scope = coerceString(payload?.scope)
    if (scope && scope !== 'all' && scope !== 'learned') throw createIpcError('INVALID_ARGUMENT', 'Invalid scope', { scope })

    const result = database.prepare("DELETE FROM user_memory WHERE id LIKE 'learned:%'").run()
    saveCounts(config, normalizeCounts(null))
    return { deletedCount: result.changes ?? 0 }
  })
}

module.exports = { registerMemoryIpcHandlers, selectMemoryForInjection }
