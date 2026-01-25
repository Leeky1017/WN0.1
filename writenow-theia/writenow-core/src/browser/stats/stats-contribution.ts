import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_STATS_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { StatsWidget } from './stats-widget';

/**
 * Command to open Stats panel.
 */
export const StatsCommands = {
    OPEN: {
        id: 'writenow.stats.open',
        label: '写作统计',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Stats contribution (P2-005).
 */
@injectable()
export class StatsContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(StatsCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_STATS_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: StatsCommands.OPEN.id,
            label: StatsCommands.OPEN.label,
            order: 'c3',
        });
    }
}

/**
 * Stats widget factory.
 */
@injectable()
export class StatsWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_STATS_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): StatsWidget {
        return new StatsWidget(this.frontendService, this.messageService);
    }
}
