import * as fs from 'node:fs';
import * as path from 'node:path';

import Database = require('better-sqlite3');

export type SqliteDatabase = ReturnType<typeof Database>;

export const SCHEMA_VERSION = 7;

export type InitDatabaseOptions = Readonly<{
    /**
     * Why: Theia backend does not have Electron's `app.getPath('userData')`; we inject a data dir that is stable
     * across restarts and can be overridden in tests/E2E via `WRITENOW_THEIA_DATA_DIR`.
     */
    dataDir: string;
}>;

export type InitDatabaseResult = Readonly<{
    db: SqliteDatabase;
    dbPath: string;
    schemaVersion: number;
}>;

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function readSchemaSql(): string {
    const candidates = [
        path.join(__dirname, 'schema.sql'),
        // When running from compiled JS, schema.sql may still be shipped under `src/` (workspace/dev mode).
        path.join(__dirname, '../../../src/node/database/schema.sql'),
    ];

    const errors: string[] = [];
    for (const filePath of candidates) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            errors.push(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    throw new Error(`Unable to load schema.sql.\n${errors.join('\n')}`);
}

function getStoredSchemaVersion(db: SqliteDatabase): number {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version') as { value?: unknown } | undefined;
    const raw = coerceString(row?.value);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return 0;
    return parsed;
}

function setStoredSchemaVersion(db: SqliteDatabase, version: number): void {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
        'schema_version',
        JSON.stringify(version),
    );
}

function hasColumn(db: SqliteDatabase, table: string, column: string): boolean {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name?: unknown }>;
    return Array.isArray(rows) && rows.some((row) => coerceString(row?.name) === column);
}

function migrateToV3(db: SqliteDatabase): void {
    const tx = db.transaction(() => {
        if (!hasColumn(db, 'articles', 'characters')) {
            db.exec("ALTER TABLE articles ADD COLUMN characters TEXT NOT NULL DEFAULT ''");
        }
        if (!hasColumn(db, 'articles', 'tags')) {
            db.exec("ALTER TABLE articles ADD COLUMN tags TEXT NOT NULL DEFAULT ''");
        }

        db.exec('DROP TRIGGER IF EXISTS articles_ai');
        db.exec('DROP TRIGGER IF EXISTS articles_ad');
        db.exec('DROP TRIGGER IF EXISTS articles_au');

        db.exec('DROP TABLE IF EXISTS articles_fts');

        db.exec(`CREATE VIRTUAL TABLE articles_fts USING fts5(
          title,
          content,
          characters,
          tags,
          content='articles',
          content_rowid='rowid',
          tokenize='unicode61'
        )`);

        db.exec(`CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
          INSERT INTO articles_fts(rowid, title, content, characters, tags)
          VALUES (new.rowid, new.title, new.content, new.characters, new.tags);
        END`);

        db.exec(`CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
          INSERT INTO articles_fts(articles_fts, rowid, title, content, characters, tags)
          VALUES('delete', old.rowid, old.title, old.content, old.characters, old.tags);
        END`);

        db.exec(`CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
          INSERT INTO articles_fts(articles_fts, rowid, title, content, characters, tags)
          VALUES('delete', old.rowid, old.title, old.content, old.characters, old.tags);
          INSERT INTO articles_fts(rowid, title, content, characters, tags)
          VALUES (new.rowid, new.title, new.content, new.characters, new.tags);
        END`);

        db.exec("INSERT INTO articles_fts(articles_fts) VALUES('rebuild')");
    });

    tx();
}

function migrateToV4(_db: SqliteDatabase): void {
    // V4 adds additive tables only (CREATE TABLE IF NOT EXISTS in schema.sql).
}

function migrateToV5(_db: SqliteDatabase): void {
    // V5 adds additive tables only (CREATE TABLE IF NOT EXISTS in schema.sql).
}

function migrateToV6(_db: SqliteDatabase): void {
    // V6 adds additive tables only (CREATE TABLE IF NOT EXISTS in schema.sql).
}

function migrateToV7(db: SqliteDatabase): void {
    const tx = db.transaction(() => {
        if (!hasColumn(db, 'skills', 'enabled')) {
            db.exec('ALTER TABLE skills ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1');
        }
        if (!hasColumn(db, 'skills', 'is_valid')) {
            db.exec('ALTER TABLE skills ADD COLUMN is_valid INTEGER NOT NULL DEFAULT 1');
        }
        if (!hasColumn(db, 'skills', 'error_code')) {
            db.exec('ALTER TABLE skills ADD COLUMN error_code TEXT');
        }
        if (!hasColumn(db, 'skills', 'error_message')) {
            db.exec('ALTER TABLE skills ADD COLUMN error_message TEXT');
        }
        if (!hasColumn(db, 'skills', 'source_uri')) {
            db.exec('ALTER TABLE skills ADD COLUMN source_uri TEXT');
        }
        if (!hasColumn(db, 'skills', 'source_hash')) {
            db.exec('ALTER TABLE skills ADD COLUMN source_hash TEXT');
        }
        if (!hasColumn(db, 'skills', 'version')) {
            db.exec('ALTER TABLE skills ADD COLUMN version TEXT');
        }
        if (!hasColumn(db, 'skills', 'scope')) {
            db.exec('ALTER TABLE skills ADD COLUMN scope TEXT');
        }
        if (!hasColumn(db, 'skills', 'package_id')) {
            db.exec('ALTER TABLE skills ADD COLUMN package_id TEXT');
        }
    });

    tx();
}

function runMigrations(db: SqliteDatabase): void {
    const current = getStoredSchemaVersion(db);
    if (current >= SCHEMA_VERSION) return;

    if (current < 3) migrateToV3(db);
    if (current < 4) migrateToV4(db);
    if (current < 5) migrateToV5(db);
    if (current < 6) migrateToV6(db);
    if (current < 7) migrateToV7(db);
    setStoredSchemaVersion(db, SCHEMA_VERSION);
}

function ensureDir(dirPath: string): void {
    if (fs.existsSync(dirPath)) return;
    fs.mkdirSync(dirPath, { recursive: true });
}

export function resolveDatabasePath(dataDir: string): string {
    const root = coerceString(dataDir);
    if (!root) {
        throw new Error('dataDir is required');
    }
    return path.join(root, 'data', 'writenow.db');
}

export function initDatabase(options: InitDatabaseOptions): InitDatabaseResult {
    const dbPath = resolveDatabasePath(options.dataDir);

    ensureDir(path.dirname(dbPath));

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schemaSql = readSchemaSql();
    db.exec(schemaSql);
    runMigrations(db);

    return { db, dbPath, schemaVersion: SCHEMA_VERSION };
}

