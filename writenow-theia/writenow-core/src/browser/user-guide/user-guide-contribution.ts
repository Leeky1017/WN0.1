import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WRITENOW_USER_GUIDE_WIDGET_ID } from '../writenow-layout-ids';
import { UserGuideWidget } from './user-guide-widget';

/**
 * Command to open User Guide.
 */
export const UserGuideCommands = {
    OPEN: {
        id: 'writenow.userGuide.open',
        label: '用户指南',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * User Guide contribution (P2-007).
 */
@injectable()
export class UserGuideContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(UserGuideCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_USER_GUIDE_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Add to Help menu
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: UserGuideCommands.OPEN.id,
            label: UserGuideCommands.OPEN.label,
            order: 'a1',
        });
    }
}

/**
 * User Guide widget factory.
 */
@injectable()
export class UserGuideWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_USER_GUIDE_WIDGET_ID;

    createWidget(): UserGuideWidget {
        return new UserGuideWidget();
    }
}
