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
}

module.exports = { registerStatsIpcHandlers }

