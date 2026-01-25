import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CHARACTER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { CharacterWidget } from './character-widget';

/**
 * Command to open Character Management panel.
 */
export const CharacterCommands = {
    OPEN: {
        id: 'writenow.character.open',
        label: '角色管理',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Character Management contribution (P2-003).
 */
@injectable()
export class CharacterContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(CharacterCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_CHARACTER_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: CharacterCommands.OPEN.id,
            label: CharacterCommands.OPEN.label,
            order: 'c1',
        });
    }
}

/**
 * Character widget factory.
 */
@injectable()
export class CharacterWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_CHARACTER_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): CharacterWidget {
        return new CharacterWidget(this.frontendService, this.messageService);
    }
}
