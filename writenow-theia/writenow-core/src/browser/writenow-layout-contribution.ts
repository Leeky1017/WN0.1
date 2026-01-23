import { Command, CommandContribution, CommandRegistry } from '@theia/core';
import { FrontendApplication, FrontendApplicationContribution, WidgetManager } from '@theia/core/lib/browser';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import { inject, injectable } from '@theia/core/shared/inversify';
import { FILE_NAVIGATOR_ID } from '@theia/navigator/lib/browser/navigator-widget';

import { WritenowAiPanelPlaceholderWidget } from './writenow-ai-panel-placeholder-widget';
import { WritenowWelcomeWidget } from './writenow-welcome-widget';

export const WRITENOW_OPEN_WELCOME_COMMAND: Command = {
    id: 'writenow.welcome.open',
    label: 'WriteNow: Open Welcome',
};

export const WRITENOW_OPEN_AI_PANEL_COMMAND: Command = {
    id: 'writenow.aiPanel.open',
    label: 'WriteNow: Open AI Panel',
};

@injectable()
export class WritenowLayoutContribution implements FrontendApplicationContribution, CommandContribution {
    constructor(
        @inject(ApplicationShell) private readonly shell: ApplicationShell,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
    ) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_OPEN_WELCOME_COMMAND, {
            execute: () => this.openWelcome({ activate: true }),
        });

        registry.registerCommand(WRITENOW_OPEN_AI_PANEL_COMMAND, {
            execute: () => this.openAiPanel({ activate: true }),
        });
    }

    /**
     * Why: Phase 1 needs a stable layout skeleton on first start so later widgets can be
     * integrated without reworking the base shell structure.
     */
    async initializeLayout(_app: FrontendApplication): Promise<void> {
        await this.ensureExplorerVisible();
        await this.openAiPanel({ activate: false });
        await this.openWelcome({ activate: true });
    }

    private async ensureExplorerVisible(): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(FILE_NAVIGATOR_ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'left' });
        }
        await this.shell.revealWidget(widget.id);
    }

    private async openAiPanel(options: Readonly<{ activate: boolean }>): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(WritenowAiPanelPlaceholderWidget.ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'right' });
        }
        if (options.activate) {
            await this.shell.activateWidget(widget.id);
        } else {
            await this.shell.revealWidget(widget.id);
        }
    }

    private async openWelcome(options: Readonly<{ activate: boolean }>): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(WritenowWelcomeWidget.ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'main' });
        }
        if (options.activate) {
            await this.shell.activateWidget(widget.id);
        } else {
            await this.shell.revealWidget(widget.id);
        }
    }
}
