const fs = require('fs')
const path = require('path')

const Database = require('better-sqlite3')

const SCHEMA_VERSION = 2

function resolveUserDataPath(userDataPath) {
  if (typeof userDataPath === 'string' && userDataPath.trim()) return userDataPath

  const electron = require('electron')
  const app = electron.app
  if (!app || typeof app.getPath !== 'function') {
    throw new Error('Electron app is not available; provide { userDataPath } in tests')
  }
  return app.getPath('userData')
}

function readSchemaSql() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  return fs.readFileSync(schemaPath, 'utf8')
}

function ensureSchemaVersion(db) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version')
  if (!row) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('schema_version', JSON.stringify(SCHEMA_VERSION))
    return
  }

  const raw = typeof row.value === 'string' ? row.value : ''
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(SCHEMA_VERSION), 'schema_version')
    return
  }

  if (parsed !== SCHEMA_VERSION) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(SCHEMA_VERSION), 'schema_version')
  }
}

function initDatabase(options = {}) {
  const userDataPath = resolveUserDataPath(options.userDataPath)

  const dataDir = path.join(userDataPath, 'data')
  fs.mkdirSync(dataDir, { recursive: true })

  const dbPath = path.join(dataDir, 'writenow.db')
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const schemaSql = readSchemaSql()
  db.exec(schemaSql)

  ensureSchemaVersion(db)

  return db
}

module.exports = { initDatabase, SCHEMA_VERSION }
