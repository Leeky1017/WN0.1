import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ShortcutsDialog } from './shortcuts-dialog';
import { AboutDialog } from './about-dialog';

export const WRITENOW_SHORTCUTS_OPEN_COMMAND: Command = {
    id: 'writenow.shortcuts.open',
    label: 'WriteNow: 快捷键速查',
    category: 'WriteNow',
};

export const WRITENOW_ABOUT_OPEN_COMMAND: Command = {
    id: 'writenow.about.open',
    label: 'WriteNow: 关于',
    category: 'WriteNow',
};

/**
 * Why: ShortcutsDialogFactory creates the ShortcutsDialog instance for Theia's widget system.
 */
@injectable()
export class ShortcutsDialogFactory implements WidgetFactory {
    static readonly ID = ShortcutsDialog.ID;
    readonly id = ShortcutsDialogFactory.ID;

    async createWidget(): Promise<ShortcutsDialog> {
        return new ShortcutsDialog();
    }
}

/**
 * Why: AboutDialogFactory creates the AboutDialog instance for Theia's widget system.
 */
@injectable()
export class AboutDialogFactory implements WidgetFactory {
    static readonly ID = AboutDialog.ID;
    readonly id = AboutDialogFactory.ID;

    async createWidget(): Promise<AboutDialog> {
        return new AboutDialog();
    }
}

/**
 * Why: HelpContribution registers help-related commands, menus, and keybindings.
 */
@injectable()
export class HelpContribution implements CommandContribution, MenuContribution, KeybindingContribution {
    constructor(@inject(WidgetManager) private readonly widgetManager: WidgetManager) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_SHORTCUTS_OPEN_COMMAND, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(ShortcutsDialog.ID);
                if (!widget.isAttached) {
                    widget.show();
                }
                widget.activate();
            },
        });

        registry.registerCommand(WRITENOW_ABOUT_OPEN_COMMAND, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(AboutDialog.ID);
                if (!widget.isAttached) {
                    widget.show();
                }
                widget.activate();
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Shortcuts in Help menu
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: WRITENOW_SHORTCUTS_OPEN_COMMAND.id,
            label: '快捷键',
            order: 'a1',
        });

        // About in Help menu
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: WRITENOW_ABOUT_OPEN_COMMAND.id,
            label: '关于 WriteNow',
            order: 'z9',
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        // Cmd+? for shortcuts dialog
        registry.registerKeybinding({
            command: WRITENOW_SHORTCUTS_OPEN_COMMAND.id,
            keybinding: 'ctrlcmd+shift+/',
        });
    }
}
