/**
 * Writing stats library for managing daily writing statistics.
 * Provides utilities for date handling, stats retrieval, and increments.
 */

/**
 * Validates and parses a date key in YYYY-MM-DD format.
 * @param {unknown} value - The value to parse
 * @returns {string|null} - The parsed date key or null if invalid
 */
function parseDateKey(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const [year, month, day] = trimmed.split('-').map(Number)
  if (year < 2000 || year > 2100) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return trimmed
}

/**
 * Returns the current local date as YYYY-MM-DD.
 * @returns {string} - The current date key
 */
function toLocalDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Maps a database row to a WritingStatsRow object.
 * @param {object|null} row - The database row
 * @param {string} date - The date key to use if row is null
 * @returns {object} - The normalized stats row
 */
function mapStatsRow(row, date) {
  return {
    date: typeof row?.date === 'string' ? row.date : date,
    wordCount: typeof row?.word_count === 'number' ? row.word_count : 0,
    writingMinutes: typeof row?.writing_minutes === 'number' ? row.writing_minutes : 0,
    articlesCreated: typeof row?.articles_created === 'number' ? row.articles_created : 0,
    skillsUsed: typeof row?.skills_used === 'number' ? row.skills_used : 0,
  }
}

/**
 * Gets writing stats for a specific date.
 * @param {object} db - The better-sqlite3 database instance
 * @param {string} date - The date key in YYYY-MM-DD format
 * @returns {object} - The writing stats row
 */
function getWritingStatsByDate(db, date) {
  const row = db.prepare('SELECT date, word_count, writing_minutes, articles_created, skills_used FROM writing_stats WHERE date = ?').get(date)
  return mapStatsRow(row, date)
}

/**
 * Gets writing stats summary for a date range.
 * @param {object} db - The better-sqlite3 database instance
 * @param {string} startDate - The start date in YYYY-MM-DD format
 * @param {string} endDate - The end date in YYYY-MM-DD format
 * @returns {object} - The summary object
 */
function getWritingStatsSummary(db, startDate, endDate) {
  const row = db
    .prepare(
      `SELECT 
        COALESCE(SUM(word_count), 0) as wordCount,
        COALESCE(SUM(writing_minutes), 0) as writingMinutes,
        COALESCE(SUM(articles_created), 0) as articlesCreated,
        COALESCE(SUM(skills_used), 0) as skillsUsed
      FROM writing_stats 
      WHERE date >= ? AND date <= ?`
    )
    .get(startDate, endDate)

  return {
    wordCount: typeof row?.wordCount === 'number' ? row.wordCount : 0,
    writingMinutes: typeof row?.writingMinutes === 'number' ? row.writingMinutes : 0,
    articlesCreated: typeof row?.articlesCreated === 'number' ? row.articlesCreated : 0,
    skillsUsed: typeof row?.skillsUsed === 'number' ? row.skillsUsed : 0,
  }
}

/**
 * Lists writing stats for a date range.
 * @param {object} db - The better-sqlite3 database instance
 * @param {string} startDate - The start date in YYYY-MM-DD format
 * @param {string} endDate - The end date in YYYY-MM-DD format
 * @returns {object[]} - Array of writing stats rows
 */
function listWritingStatsRange(db, startDate, endDate) {
  const rows = db
    .prepare('SELECT date, word_count, writing_minutes, articles_created, skills_used FROM writing_stats WHERE date >= ? AND date <= ? ORDER BY date ASC')
    .all(startDate, endDate)
  return rows.map((row) => mapStatsRow(row, row.date))
}

/**
 * Increments writing stats for a specific date.
 * @param {object} db - The better-sqlite3 database instance
 * @param {string} date - The date key in YYYY-MM-DD format
 * @param {object} increments - The increments to apply
 * @returns {object} - The updated writing stats row
 */
function incrementWritingStats(db, date, increments) {
  const wordCount = typeof increments?.wordCount === 'number' ? increments.wordCount : 0
  const writingMinutes = typeof increments?.writingMinutes === 'number' ? increments.writingMinutes : 0
  const articlesCreated = typeof increments?.articlesCreated === 'number' ? increments.articlesCreated : 0
  const skillsUsed = typeof increments?.skillsUsed === 'number' ? increments.skillsUsed : 0

  db.prepare(
    `INSERT INTO writing_stats (date, word_count, writing_minutes, articles_created, skills_used) 
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       word_count = word_count + excluded.word_count,
       writing_minutes = writing_minutes + excluded.writing_minutes,
       articles_created = articles_created + excluded.articles_created,
       skills_used = skills_used + excluded.skills_used`
  ).run(date, wordCount, writingMinutes, articlesCreated, skillsUsed)

  return getWritingStatsByDate(db, date)
}

module.exports = {
  parseDateKey,
  toLocalDateKey,
  getWritingStatsByDate,
  getWritingStatsSummary,
  listWritingStatsRange,
  incrementWritingStats,
}
