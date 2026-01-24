import { Command, CommandContribution, CommandRegistry } from '@theia/core';
import { ApplicationShell } from '@theia/core/lib/browser/shell/application-shell';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ActiveEditorService } from '../active-editor-service';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { VersionHistoryWidget } from './version-history-widget';

export const WRITENOW_OPEN_VERSION_HISTORY_COMMAND: Command = {
    id: 'writenow.versionHistory.open',
    label: 'WriteNow: Open Version History',
};

export const WRITENOW_SAVE_VERSION_SNAPSHOT_COMMAND: Command = {
    id: 'writenow.versionHistory.save',
    label: 'WriteNow: Save Version Snapshot',
};

@injectable()
export class VersionHistoryWidgetFactory implements WidgetFactory {
    static readonly ID = VersionHistoryWidget.ID;
    readonly id = VersionHistoryWidgetFactory.ID;

    constructor(
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {}

    async createWidget(): Promise<VersionHistoryWidget> {
        return new VersionHistoryWidget(this.writenow, this.activeEditor);
    }
}

@injectable()
export class VersionHistoryContribution implements CommandContribution {
    constructor(
        @inject(ApplicationShell) private readonly shell: ApplicationShell,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_OPEN_VERSION_HISTORY_COMMAND, {
            execute: () => this.openVersionHistory({ activate: true }),
        });

        registry.registerCommand(WRITENOW_SAVE_VERSION_SNAPSHOT_COMMAND, {
            execute: async () => {
                const editor = this.activeEditor.getActive();
                const articleId = editor?.getArticleId();
                if (!editor || !articleId) {
                    this.messageService.warn('No active editor.');
                    return;
                }

                const nameRaw = window.prompt('Snapshot name (optional):', '');
                if (nameRaw === null) return;
                const reasonRaw = window.prompt('Snapshot reason (optional):', '');
                if (reasonRaw === null) return;

                const name = nameRaw.trim() || undefined;
                const reason = reasonRaw.trim() || undefined;
                const content = editor.getMarkdown();

                // Why: Allow saving a snapshot without requiring the Version History widget to be open.
                try {
                    const res = await this.writenow.invokeResponse('version:create', { articleId, content, name, reason, actor: 'user' });
                    if (!res.ok) {
                        this.messageService.error(`Failed to save snapshot: ${res.error.code}: ${res.error.message}`);
                        return;
                    }
                    this.messageService.info('Snapshot saved.');
                    await this.openVersionHistory({ activate: false });
                } catch (error) {
                    this.messageService.error(`Failed to save snapshot: ${error instanceof Error ? error.message : String(error)}`);
                }
            },
        });
    }

    private async openVersionHistory(options: Readonly<{ activate: boolean }>): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(VersionHistoryWidget.ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'bottom' });
        }
        if (options.activate) {
            await this.shell.activateWidget(widget.id);
        } else {
            await this.shell.revealWidget(widget.id);
        }
    }
}
