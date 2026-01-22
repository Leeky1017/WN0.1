import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import Database = require('better-sqlite3');
import { load as loadSqliteVec } from 'sqlite-vec';

type SqliteDatabase = ReturnType<typeof Database>;

type CrudRow = {
    id: number;
    name: string;
};

@injectable()
export class SqliteVecPocBackendContribution implements BackendApplicationContribution {
    private hasRun = false;

    constructor(@inject(ILogger) private readonly logger: ILogger) {}

    /**
     * Kicks off a small sqlite + sqlite-vec smoke test at backend startup so native
     * module failures are visible early without crashing the backend.
     */
    async initialize(): Promise<void> {
        this.runOnce();
    }

    /**
     * Handles Theia versions that invoke startup work via onStart instead of initialize.
     */
    async onStart(): Promise<void> {
        this.runOnce();
    }

    /**
     * Ensures the PoC only runs once even if multiple startup hooks fire.
     */
    private runOnce(): void {
        if (this.hasRun) {
            return;
        }
        this.hasRun = true;
        this.runPoc();
    }

    /**
     * Executes the end-to-end PoC sequence with explicit error logging per stage.
     */
    private runPoc(): void {
        const dbPath = this.ensureDatabasePath();
        this.logger.info(`[sqlite-vec-poc] starting (db: ${dbPath})`);

        let db: SqliteDatabase | undefined;
        try {
            db = new Database(dbPath);
        } catch (error) {
            this.logError('open database', error);
            return;
        }

        try {
            this.runCrud(db);
            this.runVec(db);
            this.logger.info('[sqlite-vec-poc] completed successfully');
        } catch (error) {
            this.logError('run PoC', error);
        } finally {
            this.closeDatabase(db);
        }
    }

    /**
     * Stores the PoC database in a temp location to avoid coupling to workspace state.
     */
    private ensureDatabasePath(): string {
        const root = path.join(os.tmpdir(), 'writenow-theia-poc');
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true });
        }
        return path.join(root, 'sqlite-vec-poc.db');
    }

    /**
     * Validates basic sqlite CRUD so we can distinguish core DB failures from vec0 issues.
     */
    private runCrud(db: SqliteDatabase): void {
        this.logger.info('[sqlite-vec-poc] running sqlite CRUD');
        db.exec(`
            CREATE TABLE IF NOT EXISTS poc_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )
        `);

        const insertResult = db.prepare('INSERT INTO poc_items (name) VALUES (?)').run('sqlite-vec-poc');
        const rowId = typeof insertResult.lastInsertRowid === 'bigint'
            ? insertResult.lastInsertRowid.toString()
            : String(insertResult.lastInsertRowid);

        const row = db.prepare('SELECT id, name FROM poc_items WHERE id = ?').get(insertResult.lastInsertRowid) as CrudRow | undefined;
        if (!row) {
            throw new Error(`CRUD verification failed; inserted row ${rowId} not found`);
        }

        this.logger.info(`[sqlite-vec-poc] CRUD ok (row: ${JSON.stringify(row)})`);
    }

    /**
     * Exercises sqlite-vec loading + vec0 insert/query to surface extension issues early.
     */
    private runVec(db: SqliteDatabase): void {
        this.logger.info('[sqlite-vec-poc] loading sqlite-vec extension');
        // Load the extension explicitly so failures are attributed to sqlite-vec, not vec0 queries.
        loadSqliteVec(db);

        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS poc_embeddings
            USING vec0(embedding float[3])
        `);

        const vector = '[0.1, 0.2, 0.3]';
        db.prepare('INSERT INTO poc_embeddings (embedding) VALUES (vec_f32(?))').run(vector);

        const results = db.prepare(`
            SELECT rowid, distance
            FROM poc_embeddings
            WHERE embedding MATCH vec_f32(?)
            ORDER BY distance
            LIMIT 1
        `).all(vector) as Array<{ rowid: number; distance: number }>;

        this.logger.info(`[sqlite-vec-poc] vec query ok (results: ${JSON.stringify(results)})`);
    }

    /**
     * Ensures the database connection is closed even when the PoC fails.
     */
    private closeDatabase(db: SqliteDatabase): void {
        try {
            db.close();
        } catch (error) {
            this.logError('close database', error);
        }
    }

    /**
     * Normalizes error reporting so logs stay actionable across different failure paths.
     */
    private logError(stage: string, error: unknown): void {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`[sqlite-vec-poc] ${stage} failed: ${message}`);
    }
}
