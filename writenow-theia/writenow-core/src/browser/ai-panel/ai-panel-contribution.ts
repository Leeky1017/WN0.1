import { Command, CommandContribution, CommandRegistry } from '@theia/core';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ActiveEditorService } from '../active-editor-service';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { AiPanelService } from './ai-panel-service';
import { AiPanelWidget } from './ai-panel-widget';

export const WRITENOW_CLOSE_AI_PANEL_COMMAND: Command = {
    id: 'writenow.aiPanel.close',
    label: 'WriteNow: Close AI Panel',
};

@injectable()
export class AiPanelWidgetFactory implements WidgetFactory {
    static readonly ID = AiPanelWidget.ID;
    readonly id = AiPanelWidgetFactory.ID;

    constructor(
        @inject(AiPanelService) private readonly aiPanel: AiPanelService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {}

    async createWidget(): Promise<AiPanelWidget> {
        return new AiPanelWidget(this.aiPanel, this.writenow, this.activeEditor);
    }
}

@injectable()
export class AiPanelContribution implements CommandContribution, KeybindingContribution {
    constructor(@inject(WidgetManager) private readonly widgetManager: WidgetManager) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_CLOSE_AI_PANEL_COMMAND, {
            execute: async () => {
                // Why: Ensure the close action is routed through Theia's widget lifecycle (shell handles the request).
                const widget = await this.widgetManager.getOrCreateWidget(AiPanelWidget.ID);
                widget.close();
            },
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        registry.registerKeybinding({
            command: 'writenow.aiPanel.open',
            keybinding: 'ctrlcmd+k',
        });
    }
}
