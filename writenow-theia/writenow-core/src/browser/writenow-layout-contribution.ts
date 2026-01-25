import { Command, CommandContribution, CommandRegistry } from '@theia/core';
import { FrontendApplication, FrontendApplicationContribution, WidgetManager } from '@theia/core/lib/browser';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import { inject, injectable } from '@theia/core/shared/inversify';
import { FILE_NAVIGATOR_ID } from '@theia/navigator/lib/browser/navigator-widget';

import { AiPanelWidget } from './ai-panel/ai-panel-widget';
import { OutlineWidget } from './outline/outline-widget';
import { WritenowWelcomeWidget } from './writenow-welcome-widget';

export const WRITENOW_OPEN_WELCOME_COMMAND: Command = {
    id: 'writenow.welcome.open',
    label: 'WriteNow: Open Welcome',
};

export const WRITENOW_OPEN_AI_PANEL_COMMAND: Command = {
    id: 'writenow.aiPanel.open',
    label: 'WriteNow: Open AI Panel',
};

export const WRITENOW_TOGGLE_AI_PANEL_COMMAND: Command = {
    id: 'writenow.aiPanel.toggle',
    label: 'WriteNow: Toggle AI Panel',
};

export const WRITENOW_OPEN_OUTLINE_COMMAND: Command = {
    id: 'writenow.outline.openLeft',
    label: 'WriteNow: Open Outline (Left)',
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

        registry.registerCommand(WRITENOW_TOGGLE_AI_PANEL_COMMAND, {
            execute: () => this.toggleAiPanel(),
        });

        registry.registerCommand(WRITENOW_OPEN_OUTLINE_COMMAND, {
            execute: () => this.openOutlineLeft({ activate: true }),
        });
    }

    /**
     * Why: Phase 1 needs a stable layout skeleton on first start so later widgets can be
     * integrated without reworking the base shell structure.
     */
    async initializeLayout(_app: FrontendApplication): Promise<void> {
        await this.ensureExplorerVisible();
        await this.openOutlineLeft({ activate: false });
        await this.openAiPanel({ activate: false });
        await this.openWelcome({ activate: true });
    }

    /**
     * Why: Toggle AI Panel visibility for Cursor-style UX - collapse to give editor full width.
     */
    private async toggleAiPanel(): Promise<void> {
        const widget = await this.widgetManager.getWidget(AiPanelWidget.ID);
        if (widget && this.shell.getAreaFor(widget)) {
            widget.close();
        } else {
            await this.openAiPanel({ activate: true });
        }
    }

    /**
     * Why: Outline should be in left Activity Bar (alongside Explorer/Search) for Cursor-style layout.
     */
    private async openOutlineLeft(options: Readonly<{ activate: boolean }>): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(OutlineWidget.ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'left' });
        }
        if (options.activate) {
            await this.shell.activateWidget(widget.id);
        } else {
            await this.shell.revealWidget(widget.id);
        }
    }

    private async ensureExplorerVisible(): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(FILE_NAVIGATOR_ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'left' });
        }
        await this.shell.revealWidget(widget.id);
    }

    private async openAiPanel(options: Readonly<{ activate: boolean }>): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(AiPanelWidget.ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'right' });
        }
        if (options.activate) {
            await this.shell.activateWidget(widget.id);
            if (widget instanceof AiPanelWidget) {
                widget.focusInput();
            }
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
