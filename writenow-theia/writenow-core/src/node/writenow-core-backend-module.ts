import * as os from 'node:os';
import * as path from 'node:path';

import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ContainerModule } from '@theia/core/shared/inversify';
import { EmbeddingService as EmbeddingServiceToken, WRITENOW_RPC_PATH } from '../common/writenow-protocol';
import { WritenowSqliteDb } from './database/writenow-sqlite-db';
import { EmbeddingServiceImpl } from './embedding/embedding-service';
import { VectorStore } from './rag/vector-store';
import { FilesService } from './services/files-service';
import { EmbeddingRpcService } from './services/embedding-rpc-service';
import { IndexService } from './services/index-service';
import { ProjectsService } from './services/projects-service';
import { SearchService } from './services/search-service';
import { RetrievalService } from './services/retrieval-service';
import { VersionService } from './services/version-service';
import { WritenowCoreBackendContribution } from './writenow-core-backend-contribution';
import { WritenowBackendService } from './writenow-backend-service';
import { WRITENOW_DATA_DIR } from './writenow-data-dir';

export default new ContainerModule(bind => {
    bind(WritenowCoreBackendContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(WritenowCoreBackendContribution);

    const dataDirEnv = typeof process.env.WRITENOW_THEIA_DATA_DIR === 'string' ? process.env.WRITENOW_THEIA_DATA_DIR.trim() : '';
    const dataDir = dataDirEnv || path.join(os.homedir(), '.writenow-theia');
    bind(WRITENOW_DATA_DIR).toConstantValue(dataDir);

    bind(WritenowSqliteDb).toSelf().inSingletonScope();
    bind(VectorStore).toSelf().inSingletonScope();
    bind(EmbeddingServiceToken).to(EmbeddingServiceImpl).inSingletonScope();
    bind(EmbeddingRpcService).toSelf().inSingletonScope();
    bind(IndexService).toSelf().inSingletonScope();
    bind(ProjectsService).toSelf().inSingletonScope();
    bind(FilesService).toSelf().inSingletonScope();
    bind(VersionService).toSelf().inSingletonScope();
    bind(RetrievalService).toSelf().inSingletonScope();
    bind(SearchService).toSelf().inSingletonScope();

    bind(WritenowBackendService).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx => new JsonRpcConnectionHandler(WRITENOW_RPC_PATH, () => ctx.container.get(WritenowBackendService))).inSingletonScope();
});
