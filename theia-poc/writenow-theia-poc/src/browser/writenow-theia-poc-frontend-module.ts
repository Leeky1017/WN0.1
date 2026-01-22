import { CommandContribution } from '@theia/core';
import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { KeybindingContribution } from '@theia/core/lib/browser/keybinding';
import { OpenHandler } from '@theia/core/lib/browser/opener-service';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { ContainerModule, injectable } from '@theia/core/shared/inversify';
import { BackendClient, HelloBackendWithClientService, HelloBackendService, HELLO_BACKEND_PATH, HELLO_BACKEND_WITH_CLIENT_PATH } from '../common/protocol';
import { TipTapMarkdownOpenHandler } from './tiptap-markdown-open-handler';
import { TipTapMarkdownEditorWidgetFactory } from './tiptap-markdown-editor-widget-factory';
import { WritenowTheiaPocFrontendStartup } from './writenow-theia-poc-frontend-startup';
import { WritenowTheiaPocCommandContribution } from './writenow-theia-poc-contribution';

export default new ContainerModule(bind => {
    bind(WritenowTheiaPocCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WritenowTheiaPocCommandContribution);
    bind(KeybindingContribution).toService(WritenowTheiaPocCommandContribution);
    bind(FrontendApplicationContribution).to(WritenowTheiaPocFrontendStartup).inSingletonScope();

    // PoC 001: .md opener -> TipTap editor widget.
    bind(WidgetFactory).to(TipTapMarkdownEditorWidgetFactory).inSingletonScope();
    bind(OpenHandler).to(TipTapMarkdownOpenHandler).inSingletonScope();

    bind(BackendClient).to(BackendClientImpl).inSingletonScope();
    bind(ServiceConnectionProvider).toSelf().inSingletonScope();

    bind(HelloBackendService).toDynamicValue(ctx => {
        const connection = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        return connection.createProxy(HELLO_BACKEND_PATH);
    }).inSingletonScope();

    bind(HelloBackendWithClientService).toDynamicValue(ctx => {
        const connection = ctx.container.get<ServiceConnectionProvider>(RemoteConnectionProvider);
        const backendClient: BackendClient = ctx.container.get(BackendClient);
        return connection.createProxy(HELLO_BACKEND_WITH_CLIENT_PATH, backendClient);
    }).inSingletonScope();
});

@injectable()
class BackendClientImpl implements BackendClient {
    getName(): Promise<string> {
        return new Promise(resolve => resolve('Client'));
    }

}
