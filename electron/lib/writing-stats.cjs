function pad2(value) {
  return String(value).padStart(2, '0')
}

/**
 * Convert an instant to the local "YYYY-MM-DD" date key used by `writing_stats`.
 * Why: stats aggregation is defined by the user's local day boundary (not UTC).
 */
function toLocalDateKey(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date')
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || year < 1970 || year > 9999) return false
  if (!Number.isInteger(month) || month < 1 || month > 12) return false
  if (!Number.isInteger(day) || day < 1 || day > 31) return false

  const probe = new Date(year, month - 1, day)
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day
}

/**
 * Validate and normalize a `writing_stats.date` key (YYYY-MM-DD).
 * Why: IPC inputs must be defensive to keep DB queries predictable.
 */
function parseDateKey(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const [y, m, d] = raw.split('-')
  const year = Number.parseInt(y, 10)
  const month = Number.parseInt(m, 10)
  const day = Number.parseInt(d, 10)
  if (!isValidDateParts(year, month, day)) return null
  return `${pad2(year).slice(-4)}-${pad2(month)}-${pad2(day)}`
}

function coerceNonNegativeInt(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const intValue = Math.floor(value)
  if (intValue < 0) return null
  return intValue
}

function mapStatsRow(row, dateKey) {
  const date = typeof row?.date === 'string' ? row.date : dateKey
  const wordCount = typeof row?.word_count === 'number' ? row.word_count : 0
  const writingMinutes = typeof row?.writing_minutes === 'number' ? row.writing_minutes : 0
  const articlesCreated = typeof row?.articles_created === 'number' ? row.articles_created : 0
  const skillsUsed = typeof row?.skills_used === 'number' ? row.skills_used : 0
  return {
    date,
    wordCount,
    writingMinutes,
    articlesCreated,
    skillsUsed,
  }
}

function mapStatsSummaryRow(row) {
  return {
    wordCount: typeof row?.word_count === 'number' ? row.word_count : 0,
    writingMinutes: typeof row?.writing_minutes === 'number' ? row.writing_minutes : 0,
    articlesCreated: typeof row?.articles_created === 'number' ? row.articles_created : 0,
    skillsUsed: typeof row?.skills_used === 'number' ? row.skills_used : 0,
  }
}

function getWritingStatsByDate(db, dateKey) {
  if (!db) throw new Error('getWritingStatsByDate requires db')
  const parsed = parseDateKey(dateKey)
  if (!parsed) throw new Error('Invalid dateKey')
  const row = db
    .prepare('SELECT date, word_count, writing_minutes, articles_created, skills_used FROM writing_stats WHERE date = ?')
    .get(parsed)
  return mapStatsRow(row, parsed)
}

function listWritingStatsRange(db, startDate, endDate) {
  if (!db) throw new Error('listWritingStatsRange requires db')
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  if (!start || !end) throw new Error('Invalid date range')
  if (start > end) throw new Error('Invalid date range')

  const rows = db
    .prepare(
      'SELECT date, word_count, writing_minutes, articles_created, skills_used FROM writing_stats WHERE date >= ? AND date <= ? ORDER BY date ASC'
    )
    .all(start, end)
  return rows.map((row) => mapStatsRow(row, start))
}

function getWritingStatsSummary(db, startDate, endDate) {
  if (!db) throw new Error('getWritingStatsSummary requires db')
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  if (!start || !end) throw new Error('Invalid date range')
  if (start > end) throw new Error('Invalid date range')

  const row = db
    .prepare(
      'SELECT COALESCE(SUM(word_count), 0) AS word_count, COALESCE(SUM(writing_minutes), 0) AS writing_minutes, COALESCE(SUM(articles_created), 0) AS articles_created, COALESCE(SUM(skills_used), 0) AS skills_used FROM writing_stats WHERE date >= ? AND date <= ?'
    )
    .get(start, end)
  return mapStatsSummaryRow(row)
}

/**
 * Atomically increment one or more fields in `writing_stats` for a given date.
 * Why: daily aggregation must be concurrency-safe (multiple events in the same day).
 */
function incrementWritingStats(db, dateKey, increments) {
  if (!db) throw new Error('incrementWritingStats requires db')
  const parsed = parseDateKey(dateKey)
  if (!parsed) throw new Error('Invalid dateKey')

  const wordCount = coerceNonNegativeInt(increments?.wordCount) ?? 0
  const writingMinutes = coerceNonNegativeInt(increments?.writingMinutes) ?? 0
  const articlesCreated = coerceNonNegativeInt(increments?.articlesCreated) ?? 0
  const skillsUsed = coerceNonNegativeInt(increments?.skillsUsed) ?? 0

  if (wordCount + writingMinutes + articlesCreated + skillsUsed === 0) {
    return getWritingStatsByDate(db, parsed)
  }

  db.prepare(
    `INSERT INTO writing_stats (date, word_count, writing_minutes, articles_created, skills_used)
     VALUES (@date, @word_count, @writing_minutes, @articles_created, @skills_used)
     ON CONFLICT(date) DO UPDATE SET
       word_count = writing_stats.word_count + excluded.word_count,
       writing_minutes = writing_stats.writing_minutes + excluded.writing_minutes,
       articles_created = writing_stats.articles_created + excluded.articles_created,
       skills_used = writing_stats.skills_used + excluded.skills_used`
  ).run({
    date: parsed,
    word_count: wordCount,
    writing_minutes: writingMinutes,
    articles_created: articlesCreated,
    skills_used: skillsUsed,
  })

  return getWritingStatsByDate(db, parsed)
}

module.exports = {
  toLocalDateKey,
  parseDateKey,
  getWritingStatsByDate,
  listWritingStatsRange,
  getWritingStatsSummary,
  incrementWritingStats,
}

