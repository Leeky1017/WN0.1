import * as os from 'node:os';
import * as path from 'node:path';

import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ContainerModule } from '@theia/core/shared/inversify';
import { WRITENOW_RPC_PATH } from '../common/writenow-protocol';
import { WritenowCoreBackendContribution } from './writenow-core-backend-contribution';
import { WritenowBackendService } from './writenow-backend-service';
import { WRITENOW_DATA_DIR } from './writenow-data-dir';

export default new ContainerModule(bind => {
    bind(WritenowCoreBackendContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(WritenowCoreBackendContribution);

    const dataDirEnv = typeof process.env.WRITENOW_THEIA_DATA_DIR === 'string' ? process.env.WRITENOW_THEIA_DATA_DIR.trim() : '';
    const dataDir = dataDirEnv || path.join(os.homedir(), '.writenow-theia');
    bind(WRITENOW_DATA_DIR).toConstantValue(dataDir);

    bind(WritenowBackendService).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx => new JsonRpcConnectionHandler(WRITENOW_RPC_PATH, () => ctx.container.get(WritenowBackendService))).inSingletonScope();
});
