import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import { WRITENOW_DATA_DIR } from '../writenow-data-dir';
import { initDatabase, type InitDatabaseResult, type SqliteDatabase } from './init';

function createIpcError(code: 'DB_ERROR', message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

@injectable()
export class WritenowSqliteDb {
    private initResult: InitDatabaseResult | undefined;

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WRITENOW_DATA_DIR) private readonly dataDir: string,
    ) {}

    /**
     * Why: Theia backend services are long-lived; we should initialize the DB once and reuse a single connection
     * to avoid lock contention and keep schema migrations centralized.
     */
    ensureReady(): InitDatabaseResult {
        if (this.initResult) {
            return this.initResult;
        }

        try {
            this.initResult = initDatabase({ dataDir: this.dataDir });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`[writenow-db] init failed: ${message}`);
            throw createIpcError('DB_ERROR', 'Failed to initialize database', { message });
        }

        this.logger.info(`[writenow-db] ready (path: ${this.initResult.dbPath}, schema: ${this.initResult.schemaVersion})`);
        return this.initResult;
    }

    get db(): SqliteDatabase {
        return this.ensureReady().db;
    }

    get dbPath(): string {
        return this.ensureReady().dbPath;
    }
}

