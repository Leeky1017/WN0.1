import { CommandContribution, MenuContribution } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { ContainerModule } from '@theia/core/shared/inversify';
import { WritenowCoreContribution } from './writenow-core-contribution';

export default new ContainerModule(bind => {
    bind(WritenowCoreContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WritenowCoreContribution);
    bind(MenuContribution).toService(WritenowCoreContribution);
    bind(FrontendApplicationContribution).toService(WritenowCoreContribution);
});

