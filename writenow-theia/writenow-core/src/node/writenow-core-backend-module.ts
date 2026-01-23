import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ContainerModule } from '@theia/core/shared/inversify';
import { WritenowCoreBackendContribution } from './writenow-core-backend-contribution';

export default new ContainerModule(bind => {
    bind(WritenowCoreBackendContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(WritenowCoreBackendContribution);
});

