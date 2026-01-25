import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_SEMANTIC_SEARCH_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { SemanticSearchWidget } from './semantic-search-widget';

/**
 * Command to open Semantic Search panel.
 */
export const SemanticSearchCommands = {
    OPEN: {
        id: 'writenow.semanticSearch.open',
        label: '语义搜索',
        category: 'WriteNow',
    },
} satisfies Record<string, Command>;

/**
 * Semantic Search contribution (P3-002).
 *
 * Why: Exposes the embedding/RAG search capability through menu and keyboard shortcut.
 */
@injectable()
export class SemanticSearchContribution implements CommandContribution, MenuContribution, KeybindingContribution {
    @inject(WidgetManager)
    protected readonly widgetManager!: WidgetManager;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SemanticSearchCommands.OPEN, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(WRITENOW_SEMANTIC_SEARCH_WIDGET_ID);
                if (widget) {
                    widget.activate();
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Edit menu entry
        menus.registerMenuAction(CommonMenus.EDIT_FIND, {
            commandId: SemanticSearchCommands.OPEN.id,
            label: SemanticSearchCommands.OPEN.label,
            order: 'z1',
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: SemanticSearchCommands.OPEN.id,
            keybinding: 'ctrlcmd+shift+p',
        });
    }
}

/**
 * Semantic Search widget factory.
 */
@injectable()
export class SemanticSearchWidgetFactory implements WidgetFactory {
    readonly id = WRITENOW_SEMANTIC_SEARCH_WIDGET_ID;

    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    createWidget(): SemanticSearchWidget {
        return new SemanticSearchWidget(this.frontendService, this.messageService);
    }
}
