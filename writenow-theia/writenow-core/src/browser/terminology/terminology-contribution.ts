import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_TERMINOLOGY_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { TerminologyWidget } from './terminology-widget';

/**
 * Command to open Terminology panel.
 */
export const TerminologyCommands = {
    OPEN: {
        id: 'writenow.terminology.open',
        label: '术语表',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Terminology contribution (P2-004).
 */
@injectable()
export class TerminologyContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(TerminologyCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_TERMINOLOGY_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: TerminologyCommands.OPEN.id,
            label: TerminologyCommands.OPEN.label,
            order: 'c2',
        });
    }
}

/**
 * Terminology widget factory.
 */
@injectable()
export class TerminologyWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_TERMINOLOGY_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): TerminologyWidget {
        return new TerminologyWidget(this.frontendService, this.messageService);
    }
}
