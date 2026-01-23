import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import Database = require('better-sqlite3');
import { load as loadSqliteVec } from 'sqlite-vec';

type SqliteDatabase = ReturnType<typeof Database>;

@injectable()
export class WritenowCoreBackendContribution implements BackendApplicationContribution {
    private hasRun = false;

    constructor(@inject(ILogger) private readonly logger: ILogger) {}

    /**
     * Why: Run a small native-module smoke at backend startup so failures are visible early
     * (especially on Windows) without requiring additional UI interactions.
     */
    async initialize(): Promise<void> {
        this.runOnce();
    }

    /**
     * Why: Some Theia versions invoke startup work via `onStart` instead of `initialize`.
     */
    async onStart(): Promise<void> {
        this.runOnce();
    }

    private runOnce(): void {
        if (this.hasRun) {
            return;
        }
        this.hasRun = true;
        this.runNativeSmoke();
    }

    private runNativeSmoke(): void {
        const dbPath = this.ensureDatabasePath();
        this.logger.info(`[writenow-core] native smoke starting (db: ${dbPath})`);

        let db: SqliteDatabase | undefined;
        try {
            db = new Database(dbPath);
        } catch (error) {
            this.logError('open database (better-sqlite3)', error);
            return;
        }

        try {
            this.runCrud(db);
            this.runVec(db);
            this.logger.info('[writenow-core] native smoke completed successfully');
        } catch (error) {
            this.logError('run native smoke', error);
        } finally {
            this.closeDatabase(db);
        }
    }

    private ensureDatabasePath(): string {
        const root = path.join(os.tmpdir(), 'writenow-theia');
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true });
        }
        return path.join(root, 'native-smoke.db');
    }

    private runCrud(db: SqliteDatabase): void {
        this.logger.info('[writenow-core] native smoke: sqlite CRUD');
        db.exec(`
            CREATE TABLE IF NOT EXISTS writenow_core_smoke (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )
        `);

        const insertResult = db.prepare('INSERT INTO writenow_core_smoke (name) VALUES (?)').run('ok');
        const row = db.prepare('SELECT id, name FROM writenow_core_smoke WHERE id = ?').get(insertResult.lastInsertRowid) as { id: number; name: string } | undefined;
        if (!row) {
            throw new Error('CRUD verification failed: inserted row not found');
        }
        this.logger.info(`[writenow-core] native smoke: CRUD ok (row: ${JSON.stringify(row)})`);
    }

    private runVec(db: SqliteDatabase): void {
        this.logger.info('[writenow-core] native smoke: loading sqlite-vec');
        loadSqliteVec(db);

        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS writenow_core_embeddings
            USING vec0(embedding float[3])
        `);

        const vector = '[0.1, 0.2, 0.3]';
        db.prepare('INSERT INTO writenow_core_embeddings (embedding) VALUES (vec_f32(?))').run(vector);

        const results = db.prepare(`
            SELECT rowid, distance
            FROM writenow_core_embeddings
            WHERE embedding MATCH vec_f32(?)
            ORDER BY distance
            LIMIT 1
        `).all(vector) as Array<{ rowid: number; distance: number }>;

        this.logger.info(`[writenow-core] native smoke: vec query ok (results: ${JSON.stringify(results)})`);
    }

    private closeDatabase(db: SqliteDatabase): void {
        try {
            db.close();
        } catch (error) {
            this.logError('close database', error);
        }
    }

    private logError(stage: string, error: unknown): void {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`[writenow-core] ${stage} failed: ${message}`);
    }
}

