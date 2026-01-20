const DEFAULT_SECURE_KEYS = ['ai.apiKey']

let db = null
let safeStorage = null
let logger = null

function initConfig(options = {}) {
  if (!options.db) throw new Error('config.initConfig requires { db }')
  db = options.db
  logger = options.logger ?? null
  safeStorage = options.safeStorage ?? null
}

function getSafeStorage() {
  if (safeStorage) return safeStorage
  const electron = require('electron')
  safeStorage = electron.safeStorage
  return safeStorage
}

function assertDb() {
  if (!db) throw new Error('config is not initialized')
  return db
}

function serializeValue(value) {
  return JSON.stringify(value)
}

function deserializeValue(raw) {
  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function upsert(key, value) {
  const database = assertDb()
  const stmt = database.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  stmt.run(key, value)
}

function get(key) {
  const database = assertDb()
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row) return null
  return deserializeValue(row.value)
}

function set(key, value) {
  upsert(key, serializeValue(value))
  logger?.info?.('config', 'set', { key })
}

function setSecure(key, value) {
  if (typeof value !== 'string') throw new Error('secure config value must be a string')
  const storage = getSafeStorage()
  if (!storage?.isEncryptionAvailable?.()) {
    throw new Error('safeStorage encryption is not available on this system')
  }
  const encrypted = storage.encryptString(value)
  upsert(key, encrypted.toString('base64'))
  logger?.info?.('config', 'setSecure', { key })
}

function getSecure(key) {
  const database = assertDb()
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row || typeof row.value !== 'string' || !row.value) return null
  const storage = getSafeStorage()
  if (!storage?.isEncryptionAvailable?.()) {
    throw new Error('safeStorage encryption is not available on this system')
  }
  const buf = Buffer.from(row.value, 'base64')
  return storage.decryptString(buf)
}

function getAll(options = {}) {
  const includeSecure = Boolean(options.includeSecure)
  const secureKeys = Array.isArray(options.secureKeys) ? options.secureKeys : DEFAULT_SECURE_KEYS

  const database = assertDb()
  const rows = database.prepare('SELECT key, value FROM settings').all()
  const result = {}
  for (const row of rows) {
    if (!row || typeof row.key !== 'string') continue
    const key = row.key

    if (secureKeys.includes(key)) {
      result[key] = includeSecure ? getSecure(key) : null
      continue
    }

    result[key] = deserializeValue(row.value)
  }
  return result
}

module.exports = {
  initConfig,
  get,
  set,
  getSecure,
  setSecure,
  getAll,
}

