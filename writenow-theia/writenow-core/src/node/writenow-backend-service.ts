import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type { IpcChannel, IpcResponse } from '../common/ipc-generated';
import type { WritenowRpcService } from '../common/writenow-protocol';

import { TheiaInvokeRegistry, toIpcError } from './theia-invoke-adapter';
import { WritenowSqliteDb } from './database/writenow-sqlite-db';
import { FilesService } from './services/files-service';
import { ProjectsService } from './services/projects-service';
import { VersionService } from './services/version-service';

@injectable()
export class WritenowBackendService implements WritenowRpcService {
    private readonly registry = new TheiaInvokeRegistry();

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) sqliteDb: WritenowSqliteDb,
        @inject(ProjectsService) projectsService: ProjectsService,
        @inject(FilesService) filesService: FilesService,
        @inject(VersionService) versionService: VersionService,
    ) {
        // Why: Task 009 requires the DB to be initialized at backend startup (not lazily on first request),
        // so failures surface early and are actionable.
        sqliteDb.ensureReady();

        projectsService.register(this.registry);
        filesService.register(this.registry);
        versionService.register(this.registry);
    }

    async invoke(channel: IpcChannel, payload: unknown): Promise<IpcResponse<unknown>> {
        const handler = this.registry.get(channel);
        if (!handler) {
            return { ok: false, error: { code: 'NOT_FOUND', message: 'IPC channel not found', details: { channel } } };
        }

        try {
            const data = await handler(undefined, payload);
            return { ok: true, data };
        } catch (error) {
            const ipcError = toIpcError(error);
            this.logger.error(`[writenow-rpc] invoke failed: ${channel} (${ipcError.code})`);
            return { ok: false, error: ipcError };
        }
    }
}

