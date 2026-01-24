import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ActiveEditorService } from '../active-editor-service';
import { OutlineWidget } from './outline-widget';

export const WRITENOW_OUTLINE_OPEN_COMMAND: Command = {
    id: 'writenow.outline.open',
    label: 'WriteNow: 打开大纲',
    category: 'WriteNow',
};

/**
 * Why: OutlineWidgetFactory creates the OutlineWidget instance for Theia's widget system.
 */
@injectable()
export class OutlineWidgetFactory implements WidgetFactory {
    static readonly ID = OutlineWidget.ID;
    readonly id = OutlineWidgetFactory.ID;

    constructor(
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {}

    async createWidget(): Promise<OutlineWidget> {
        return new OutlineWidget(this.activeEditor);
    }
}

/**
 * Why: OutlineContribution registers the outline panel command and menu entry.
 */
@injectable()
export class OutlineContribution implements CommandContribution, MenuContribution {
    constructor(@inject(WidgetManager) private readonly widgetManager: WidgetManager) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_OUTLINE_OPEN_COMMAND, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(OutlineWidget.ID);
                if (!widget.isAttached) {
                    widget.show();
                }
                widget.activate();
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Why: View menu is the standard location for panels
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: WRITENOW_OUTLINE_OPEN_COMMAND.id,
            label: '大纲',
            order: 'a1',
        });
    }
}
