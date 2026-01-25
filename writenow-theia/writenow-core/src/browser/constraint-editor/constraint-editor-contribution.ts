import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CONSTRAINT_EDITOR_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { ConstraintEditorWidget } from './constraint-editor-widget';

/**
 * Command to open Constraint Editor panel.
 */
export const ConstraintEditorCommands = {
    OPEN: {
        id: 'writenow.constraintEditor.open',
        label: '约束编辑器',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Constraint Editor contribution (P3-003).
 *
 * Why: Exposes AI writing constraint management through the View menu.
 */
@injectable()
export class ConstraintEditorContribution implements CommandContribution, MenuContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(ConstraintEditorCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_CONSTRAINT_EDITOR_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: ConstraintEditorCommands.OPEN.id,
            label: ConstraintEditorCommands.OPEN.label,
            order: 'c4',
        });
    }
}

/**
 * Constraint Editor widget factory.
 */
@injectable()
export class ConstraintEditorWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_CONSTRAINT_EDITOR_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): ConstraintEditorWidget {
        return new ConstraintEditorWidget(this.frontendService, this.messageService);
    }
}
