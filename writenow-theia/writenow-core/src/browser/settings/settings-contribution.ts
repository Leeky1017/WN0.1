import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

import { SettingsWidget } from './settings-widget';

export const WRITENOW_SETTINGS_OPEN_COMMAND: Command = {
    id: 'writenow.settings.open',
    label: 'WriteNow: 打开设置',
    category: 'WriteNow',
};

export const WRITENOW_SETTINGS_CLOSE_COMMAND: Command = {
    id: 'writenow.settings.close',
    label: 'WriteNow: 关闭设置',
    category: 'WriteNow',
};

/**
 * Why: SettingsWidgetFactory creates the SettingsWidget instance for Theia's widget system.
 * This follows the pattern established by AiPanelWidgetFactory.
 */
@injectable()
export class SettingsWidgetFactory implements WidgetFactory {
    static readonly ID = SettingsWidget.ID;
    readonly id = SettingsWidgetFactory.ID;

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
    ) {}

    async createWidget(): Promise<SettingsWidget> {
        return new SettingsWidget(this.messageService);
    }
}

/**
 * Why: SettingsContribution registers the settings panel command, menu entry, and keybinding.
 * Cmd+, is the standard shortcut for settings in most applications.
 */
@injectable()
export class SettingsContribution implements CommandContribution, MenuContribution, KeybindingContribution {
    constructor(@inject(WidgetManager) private readonly widgetManager: WidgetManager) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_SETTINGS_OPEN_COMMAND, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(SettingsWidget.ID);
                if (!widget.isAttached) {
                    // Why: Widget will be shown in main area
                    widget.show();
                }
                widget.activate();
            },
        });

        registry.registerCommand(WRITENOW_SETTINGS_CLOSE_COMMAND, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(SettingsWidget.ID);
                widget.close();
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // Why: File > Preferences > Settings is the standard location for settings
        menus.registerMenuAction(CommonMenus.FILE_SETTINGS_SUBMENU, {
            commandId: WRITENOW_SETTINGS_OPEN_COMMAND.id,
            label: '设置',
            order: '0',
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        // Why: Cmd+, is the standard shortcut for settings in macOS and many apps
        registry.registerKeybinding({
            command: WRITENOW_SETTINGS_OPEN_COMMAND.id,
            keybinding: 'ctrlcmd+,',
        });
    }
}
