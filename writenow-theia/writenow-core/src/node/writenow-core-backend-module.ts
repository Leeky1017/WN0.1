import * as os from 'node:os';
import * as path from 'node:path';

import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ContainerModule } from '@theia/core/shared/inversify';
import {
    AIService as AIServiceToken,
    EmbeddingService as EmbeddingServiceToken,
    SkillsService as SkillsServiceToken,
    WRITENOW_AI_RPC_PATH,
    WRITENOW_RPC_PATH,
    WRITENOW_SKILLS_RPC_PATH,
    type AiServiceClient,
} from '../common/writenow-protocol';
import { WritenowSqliteDb } from './database/writenow-sqlite-db';
import { EmbeddingServiceImpl } from './embedding/embedding-service';
import { VectorStore } from './rag/vector-store';
import { AiService as AiServiceImpl } from './services/ai-service';
import { ContextService } from './services/context-service';
import { FilesService } from './services/files-service';
import { EmbeddingRpcService } from './services/embedding-rpc-service';
import { ExportService } from './services/export-service';
import { IndexService } from './services/index-service';
import { KnowledgeGraphService } from './services/knowledge-graph-service';
import { ProjectsService } from './services/projects-service';
import { SearchService } from './services/search-service';
import { RetrievalService } from './services/retrieval-service';
import { SkillsService as SkillsServiceImpl } from './services/skills-service';
import { SnapshotService } from './services/snapshot-service';
import { StatsService } from './services/stats-service';
import { VersionService } from './services/version-service';
import { WritenowCoreBackendContribution } from './writenow-core-backend-contribution';
import { WritenowBackendService } from './writenow-backend-service';
import { StandaloneFrontendBridge } from './standalone-frontend-bridge';
import { WRITENOW_DATA_DIR } from './writenow-data-dir';

export default new ContainerModule(bind => {
    bind(WritenowCoreBackendContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(WritenowCoreBackendContribution);

    // Standalone frontend bridge for writenow-frontend
    bind(StandaloneFrontendBridge).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(StandaloneFrontendBridge);

    const dataDirEnv = typeof process.env.WRITENOW_THEIA_DATA_DIR === 'string' ? process.env.WRITENOW_THEIA_DATA_DIR.trim() : '';
    const dataDir = dataDirEnv || path.join(os.homedir(), '.writenow-theia');
    bind(WRITENOW_DATA_DIR).toConstantValue(dataDir);

    bind(WritenowSqliteDb).toSelf().inSingletonScope();
    bind(VectorStore).toSelf().inSingletonScope();
    bind(EmbeddingServiceToken).to(EmbeddingServiceImpl).inSingletonScope();
    bind(EmbeddingRpcService).toSelf().inSingletonScope();
    bind(IndexService).toSelf().inSingletonScope();
    bind(ProjectsService).toSelf().inSingletonScope();
    bind(KnowledgeGraphService).toSelf().inSingletonScope();
    bind(FilesService).toSelf().inSingletonScope();
    bind(VersionService).toSelf().inSingletonScope();
    bind(RetrievalService).toSelf().inSingletonScope();
    bind(SearchService).toSelf().inSingletonScope();
    bind(ContextService).toSelf().inSingletonScope();
    bind(StatsService).toSelf().inSingletonScope();
    bind(SnapshotService).toSelf().inSingletonScope();
    bind(ExportService).toSelf().inSingletonScope();

    bind(SkillsServiceToken).to(SkillsServiceImpl).inSingletonScope();
    bind(AIServiceToken).to(AiServiceImpl).inSingletonScope();

    bind(WritenowBackendService).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx => new JsonRpcConnectionHandler(WRITENOW_RPC_PATH, () => ctx.container.get(WritenowBackendService))).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx => new JsonRpcConnectionHandler(WRITENOW_SKILLS_RPC_PATH, () => ctx.container.get(SkillsServiceToken))).inSingletonScope();
    bind(ConnectionHandler)
        .toDynamicValue(
            ctx =>
                new JsonRpcConnectionHandler<AiServiceClient>(WRITENOW_AI_RPC_PATH, client => {
                    const server = ctx.container.get<AiServiceImpl>(AIServiceToken);
                    server.setClient(client);
                    client.onDidCloseConnection(() => server.setClient(undefined));
                    return server;
                }),
        )
        .inSingletonScope();
});
