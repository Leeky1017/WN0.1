const {
  getWritingStatsByDate,
  getWritingStatsSummary,
  incrementWritingStats,
  listWritingStatsRange,
  parseDateKey,
  toLocalDateKey,
} = require('../lib/writing-stats.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

/**
 * Config keys for writing goals.
 */
const GOAL_SETTINGS_KEYS = Object.freeze({
  weeklyGoal: 'stats.goal.weekly',
  monthlyGoal: 'stats.goal.monthly',
})

/**
 * Default writing goals.
 */
const DEFAULT_GOALS = Object.freeze({
  weeklyGoal: 5000, // words per week
  monthlyGoal: 20000, // words per month
})

/**
 * Reads writing goals from config.
 * @param {object} config - The electron-store config instance
 * @returns {object} - The WritingGoal object
 */
function readGoals(config) {
  if (!config || typeof config.get !== 'function') {
    return { ...DEFAULT_GOALS }
  }
  const weeklyGoal = config.get(GOAL_SETTINGS_KEYS.weeklyGoal)
  const monthlyGoal = config.get(GOAL_SETTINGS_KEYS.monthlyGoal)
  return {
    weeklyGoal: typeof weeklyGoal === 'number' && Number.isFinite(weeklyGoal) && weeklyGoal >= 0 ? weeklyGoal : DEFAULT_GOALS.weeklyGoal,
    monthlyGoal: typeof monthlyGoal === 'number' && Number.isFinite(monthlyGoal) && monthlyGoal >= 0 ? monthlyGoal : DEFAULT_GOALS.monthlyGoal,
  }
}

/**
 * Writes writing goals to config.
 * @param {object} config - The electron-store config instance
 * @param {object} patch - The partial goals to update
 * @returns {object} - The updated WritingGoal object
 */
function writeGoals(config, patch) {
  if (!config || typeof config.set !== 'function') {
    throw createIpcError('INTERNAL', 'Config is not available')
  }
  const current = readGoals(config)

  if (typeof patch?.weeklyGoal === 'number' && Number.isFinite(patch.weeklyGoal) && patch.weeklyGoal >= 0) {
    config.set(GOAL_SETTINGS_KEYS.weeklyGoal, Math.floor(patch.weeklyGoal))
  }
  if (typeof patch?.monthlyGoal === 'number' && Number.isFinite(patch.monthlyGoal) && patch.monthlyGoal >= 0) {
    config.set(GOAL_SETTINGS_KEYS.monthlyGoal, Math.floor(patch.monthlyGoal))
  }

  return readGoals(config)
}

/**
 * Maps a database row to an Activity object.
 * @param {object|null} row - The database row
 * @returns {object} - The normalized activity object
 */
function mapActivityRow(row) {
  return {
    id: typeof row?.id === 'string' ? row.id : '',
    type: typeof row?.type === 'string' ? row.type : 'edit',
    projectId: typeof row?.project_id === 'string' ? row.project_id : undefined,
    projectName: typeof row?.project_name === 'string' ? row.project_name : undefined,
    description: typeof row?.description === 'string' ? row.description : '',
    timestamp: typeof row?.timestamp === 'string' ? row.timestamp : '',
  }
}

function coerceDateKey(value, fallback) {
  const parsed = parseDateKey(value)
  if (parsed) return parsed
  return fallback
}

function coerceNonNegativeInt(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const intValue = Math.floor(value)
  if (intValue < 0) return null
  return intValue
}

function pickIncrements(payload) {
  const raw = payload?.increments
  if (!raw || typeof raw !== 'object') return null

  const wordCount = typeof raw.wordCount === 'undefined' ? undefined : coerceNonNegativeInt(raw.wordCount)
  const writingMinutes = typeof raw.writingMinutes === 'undefined' ? undefined : coerceNonNegativeInt(raw.writingMinutes)
  const articlesCreated = typeof raw.articlesCreated === 'undefined' ? undefined : coerceNonNegativeInt(raw.articlesCreated)
  const skillsUsed = typeof raw.skillsUsed === 'undefined' ? undefined : coerceNonNegativeInt(raw.skillsUsed)

  if (typeof raw.wordCount !== 'undefined' && wordCount === null) return null
  if (typeof raw.writingMinutes !== 'undefined' && writingMinutes === null) return null
  if (typeof raw.articlesCreated !== 'undefined' && articlesCreated === null) return null
  if (typeof raw.skillsUsed !== 'undefined' && skillsUsed === null) return null

  const total =
    (wordCount ?? 0) + (writingMinutes ?? 0) + (articlesCreated ?? 0) + (skillsUsed ?? 0)
  if (total <= 0) return null

  return {
    wordCount,
    writingMinutes,
    articlesCreated,
    skillsUsed,
  }
}

function registerStatsIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const config = options.config ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('stats:getToday', async () => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const date = toLocalDateKey()
    return { stats: getWritingStatsByDate(db, date) }
  })

  handleInvoke('stats:getRange', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')

    const startDate = parseDateKey(payload?.startDate)
    const endDate = parseDateKey(payload?.endDate)
    if (!startDate || !endDate) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid date range', { startDate: payload?.startDate, endDate: payload?.endDate })
    }
    if (startDate > endDate) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid date range', { startDate, endDate })
    }

    try {
      const items = listWritingStatsRange(db, startDate, endDate)
      const summary = getWritingStatsSummary(db, startDate, endDate)
      return { items, summary }
    } catch (error) {
      logger?.error?.('stats', 'getRange failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to query writing stats', { message: error?.message })
    }
  })

  handleInvoke('stats:increment', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')

    const today = toLocalDateKey()
    const date = coerceDateKey(payload?.date, today)
    if (!date) throw createIpcError('INVALID_ARGUMENT', 'Invalid date', { date: payload?.date })

    const increments = pickIncrements(payload)
    if (!increments) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid increments', { increments: payload?.increments })
    }

    try {
      const stats = incrementWritingStats(db, date, increments)
      return { stats }
    } catch (error) {
      logger?.error?.('stats', 'increment failed', { message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to update writing stats', { message: error?.message })
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Writing Goals (P9-04)
  // ─────────────────────────────────────────────────────────────────────────────

  handleInvoke('stats:goal:get', async () => {
    const goal = readGoals(config)
    return { goal }
  })

  handleInvoke('stats:goal:set', async (_evt, payload) => {
    const goal = writeGoals(config, payload)
    return { goal }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Activity Log (P9-04)
  // ─────────────────────────────────────────────────────────────────────────────

  handleInvoke('stats:activity:list', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')

    const limitRaw = payload?.limit
    const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.floor(limitRaw)) : 50

    const projectId = typeof payload?.projectId === 'string' ? payload.projectId.trim() : null

    try {
      let sql = `SELECT a.id, a.type, a.project_id, p.name as project_name, a.description, a.timestamp 
                 FROM activities a 
                 LEFT JOIN projects p ON a.project_id = p.id`
      const params = {}

      if (projectId) {
        sql += ' WHERE a.project_id = @project_id'
        params.project_id = projectId
      }

      sql += ' ORDER BY a.timestamp DESC LIMIT @limit'
      params.limit = limit

      const rows = db.prepare(sql).all(params)
      return { activities: rows.map(mapActivityRow).filter((a) => a.id) }
    } catch (error) {
      // Table may not exist yet - return empty list
      logger?.warn?.('stats', 'activity list query failed (table may not exist)', { message: error?.message })
      return { activities: [] }
    }
  })
}

module.exports = { registerStatsIpcHandlers }

