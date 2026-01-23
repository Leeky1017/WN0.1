import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { inject, injectable } from '@theia/core/shared/inversify';

export const WRITENOW_CORE_HELLO_COMMAND: Command = {
    id: 'writenow.core.hello',
    label: 'WriteNow: Hello'
};

@injectable()
export class WritenowCoreContribution implements CommandContribution, MenuContribution, FrontendApplicationContribution {
    constructor(@inject(MessageService) private readonly messageService: MessageService) {}

    /**
     * Why: The scaffold needs a visible signal that our custom frontend contribution is loaded.
     */
    onStart(): void {
        // eslint-disable-next-line no-console
        console.info('[writenow-core] frontend started');
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_CORE_HELLO_COMMAND, {
            execute: () => this.messageService.info('WriteNow core extension is loaded.'),
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: WRITENOW_CORE_HELLO_COMMAND.id,
            label: WRITENOW_CORE_HELLO_COMMAND.label,
        });
    }
}

