import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CONTEXT_DEBUGGER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { ContextDebuggerWidget } from './context-debugger-widget';

/**
 * Command to open Context Debugger panel.
 */
export const ContextDebuggerCommands = {
    OPEN: {
        id: 'writenow.contextDebugger.open',
        label: '上下文调试器',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Developer menu path for View > Developer submenu.
 */
const DEVELOPER_MENU = [...CommonMenus.VIEW, 'developer'];

/**
 * Context Debugger contribution (P3-001).
 *
 * Why: Provides visibility into AI context assembly for debugging.
 * Accessible via View > Developer > Context Debugger menu.
 */
@injectable()
export class ContextDebuggerContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(ContextDebuggerCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_CONTEXT_DEBUGGER_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Register Developer submenu under View
        menus.registerSubmenu(DEVELOPER_MENU, '开发者工具', { order: 'z' });

        // Register Context Debugger under View > Developer
        menus.registerMenuAction(DEVELOPER_MENU, {
            commandId: ContextDebuggerCommands.OPEN.id,
            label: ContextDebuggerCommands.OPEN.label,
            order: 'a1',
        });
    }
}

/**
 * Context Debugger widget factory.
 */
@injectable()
export class ContextDebuggerWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_CONTEXT_DEBUGGER_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): ContextDebuggerWidget {
        return new ContextDebuggerWidget(this.frontendService, this.messageService);
    }
}
