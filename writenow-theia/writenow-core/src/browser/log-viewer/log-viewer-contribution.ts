import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_LOG_VIEWER_WIDGET_ID } from '../writenow-layout-ids';
import { LogViewerWidget } from './log-viewer-widget';

/**
 * Command to open Log Viewer.
 */
export const LogViewerCommands = {
    OPEN: {
        id: 'writenow.logViewer.open',
        label: '查看日志',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Log Viewer contribution (P2-006).
 */
@injectable()
export class LogViewerContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(LogViewerCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_LOG_VIEWER_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Add to Help menu
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: LogViewerCommands.OPEN.id,
            label: LogViewerCommands.OPEN.label,
            order: 'z1',
        });
    }
}

/**
 * Log Viewer widget factory.
 */
@injectable()
export class LogViewerWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_LOG_VIEWER_WIDGET_ID;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): LogViewerWidget {
        return new LogViewerWidget(this.messageService);
    }
}
