const fs = require('fs')
const path = require('path')

const Database = require('better-sqlite3')

const SCHEMA_VERSION = 7

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

function getStoredSchemaVersion(db) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version')
  if (!row || typeof row.value !== 'string') return 0

  const parsed = Number.parseInt(row.value, 10)
  if (Number.isNaN(parsed)) return 0
  return parsed
}

function setStoredSchemaVersion(db, version) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', JSON.stringify(version))
}

function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all()
  return Array.isArray(rows) && rows.some((r) => r && r.name === column)
}

function migrateToV3(db) {
  const tx = db.transaction(() => {
    if (!hasColumn(db, 'articles', 'characters')) {
      db.exec("ALTER TABLE articles ADD COLUMN characters TEXT NOT NULL DEFAULT ''")
    }
    if (!hasColumn(db, 'articles', 'tags')) {
      db.exec("ALTER TABLE articles ADD COLUMN tags TEXT NOT NULL DEFAULT ''")
    }

    db.exec('DROP TRIGGER IF EXISTS articles_ai')
    db.exec('DROP TRIGGER IF EXISTS articles_ad')
    db.exec('DROP TRIGGER IF EXISTS articles_au')

    db.exec('DROP TABLE IF EXISTS articles_fts')

    db.exec(`CREATE VIRTUAL TABLE articles_fts USING fts5(
      title,
      content,
      characters,
      tags,
      content='articles',
      content_rowid='rowid',
      tokenize='unicode61'
    )`)

    db.exec(`CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, content, characters, tags)
      VALUES (new.rowid, new.title, new.content, new.characters, new.tags);
    END`)

    db.exec(`CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, content, characters, tags)
      VALUES('delete', old.rowid, old.title, old.content, old.characters, old.tags);
    END`)

    db.exec(`CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, content, characters, tags)
      VALUES('delete', old.rowid, old.title, old.content, old.characters, old.tags);
      INSERT INTO articles_fts(rowid, title, content, characters, tags)
      VALUES (new.rowid, new.title, new.content, new.characters, new.tags);
    END`)

    db.exec("INSERT INTO articles_fts(articles_fts) VALUES('rebuild')")
  })

  tx()
}

function migrateToV4(_db) {
  // V4 adds additive tables only (CREATE TABLE IF NOT EXISTS in schema.sql).
}

function migrateToV5(_db) {
  // V5 adds additive tables only (CREATE TABLE IF NOT EXISTS in schema.sql).
}

function migrateToV6(_db) {
  // V6 adds additive tables only (CREATE TABLE IF NOT EXISTS in schema.sql).
}

function migrateToV7(db) {
  const tx = db.transaction(() => {
    if (!hasColumn(db, 'skills', 'enabled')) {
      db.exec('ALTER TABLE skills ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1')
    }
    if (!hasColumn(db, 'skills', 'is_valid')) {
      db.exec('ALTER TABLE skills ADD COLUMN is_valid INTEGER NOT NULL DEFAULT 1')
    }
    if (!hasColumn(db, 'skills', 'error_code')) {
      db.exec('ALTER TABLE skills ADD COLUMN error_code TEXT')
    }
    if (!hasColumn(db, 'skills', 'error_message')) {
      db.exec('ALTER TABLE skills ADD COLUMN error_message TEXT')
    }
    if (!hasColumn(db, 'skills', 'source_uri')) {
      db.exec('ALTER TABLE skills ADD COLUMN source_uri TEXT')
    }
    if (!hasColumn(db, 'skills', 'source_hash')) {
      db.exec('ALTER TABLE skills ADD COLUMN source_hash TEXT')
    }
    if (!hasColumn(db, 'skills', 'version')) {
      db.exec('ALTER TABLE skills ADD COLUMN version TEXT')
    }
    if (!hasColumn(db, 'skills', 'scope')) {
      db.exec('ALTER TABLE skills ADD COLUMN scope TEXT')
    }
    if (!hasColumn(db, 'skills', 'package_id')) {
      db.exec('ALTER TABLE skills ADD COLUMN package_id TEXT')
    }
  })

  tx()
}

function runMigrations(db) {
  const current = getStoredSchemaVersion(db)
  if (current >= SCHEMA_VERSION) return

  if (current < 3) migrateToV3(db)
  if (current < 4) migrateToV4(db)
  if (current < 5) migrateToV5(db)
  if (current < 6) migrateToV6(db)
  if (current < 7) migrateToV7(db)
  setStoredSchemaVersion(db, SCHEMA_VERSION)
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
  runMigrations(db)

  return db
}

module.exports = { initDatabase, SCHEMA_VERSION }
