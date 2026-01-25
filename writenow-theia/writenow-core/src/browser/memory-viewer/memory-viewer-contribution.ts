import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_MEMORY_VIEWER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { MemoryViewerWidget } from './memory-viewer-widget';

/**
 * Command to open Memory Viewer panel.
 */
export const MemoryViewerCommands = {
    OPEN: {
        id: 'writenow.memoryViewer.open',
        label: '记忆查看器',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Memory Viewer contribution (P3-004).
 *
 * Why: Exposes AI memory management capability through the View menu.
 */
@injectable()
export class MemoryViewerContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(MemoryViewerCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_MEMORY_VIEWER_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: MemoryViewerCommands.OPEN.id,
            label: MemoryViewerCommands.OPEN.label,
            order: 'c5',
        });
    }
}

/**
 * Memory Viewer widget factory.
 */
@injectable()
export class MemoryViewerWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_MEMORY_VIEWER_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): MemoryViewerWidget {
        return new MemoryViewerWidget(this.frontendService, this.messageService);
    }
}
