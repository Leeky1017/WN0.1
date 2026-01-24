import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from '@theia/core';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ActiveEditorService } from '../active-editor-service';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { KnowledgeGraphWidget } from './knowledge-graph-widget';

export const WRITENOW_OPEN_KNOWLEDGE_GRAPH_COMMAND: Command = {
    id: 'writenow.knowledgeGraph.open',
    label: 'WriteNow: Open Knowledge Graph',
};

export const WRITENOW_CREATE_ENTITY_FROM_SELECTION_COMMAND: Command = {
    id: 'writenow.knowledgeGraph.createEntityFromSelection',
    label: 'WriteNow: Create Knowledge Graph Entity from Selection',
};

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function clampString(value: string, max: number): string {
    const trimmed = coerceString(value);
    if (!trimmed) return '';
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function formatError(error: unknown): string {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.message || error.name;
    return String(error);
}

@injectable()
export class KnowledgeGraphWidgetFactory implements WidgetFactory {
    static readonly ID = KnowledgeGraphWidget.ID;
    readonly id = KnowledgeGraphWidgetFactory.ID;

    constructor(@inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService) {}

    async createWidget(): Promise<KnowledgeGraphWidget> {
        return new KnowledgeGraphWidget(this.writenow);
    }
}

@injectable()
export class KnowledgeGraphContribution implements CommandContribution, MenuContribution {
    constructor(
        @inject(ApplicationShell) private readonly shell: ApplicationShell,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {}

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_OPEN_KNOWLEDGE_GRAPH_COMMAND, {
            execute: () => this.openWidget({ activate: true }),
        });

        registry.registerCommand(WRITENOW_CREATE_ENTITY_FROM_SELECTION_COMMAND, {
            execute: () => this.createEntityFromSelection(),
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.VIEW, {
            commandId: WRITENOW_OPEN_KNOWLEDGE_GRAPH_COMMAND.id,
            label: WRITENOW_OPEN_KNOWLEDGE_GRAPH_COMMAND.label,
        });

        menus.registerMenuAction(CommonMenus.EDIT, {
            commandId: WRITENOW_CREATE_ENTITY_FROM_SELECTION_COMMAND.id,
            label: WRITENOW_CREATE_ENTITY_FROM_SELECTION_COMMAND.label,
        });
    }

    private async openWidget(options: Readonly<{ activate: boolean }>): Promise<KnowledgeGraphWidget> {
        const widget = await this.widgetManager.getOrCreateWidget(KnowledgeGraphWidget.ID);
        if (!this.shell.getAreaFor(widget)) {
            await this.shell.addWidget(widget, { area: 'main' });
        }
        if (options.activate) {
            await this.shell.activateWidget(widget.id);
        } else {
            await this.shell.revealWidget(widget.id);
        }

        if (widget instanceof KnowledgeGraphWidget) {
            widget.requestRefresh();
            return widget;
        }
        return widget as KnowledgeGraphWidget;
    }

    /**
     * Create a KG entity from the currently selected editor text.
     *
     * Why: Phase 3 requires a minimal closure from "editor selection" into the Knowledge Graph data layer.
     */
    private async createEntityFromSelection(): Promise<void> {
        const editor = this.activeEditor.getActive();
        const snapshot = editor?.getSelectionSnapshot() ?? null;
        const selectedText = snapshot ? snapshot.text : '';
        const name = clampString(selectedText, 120);
        if (!name) {
            this.messageService.info('No selection.');
            return;
        }

        try {
            const bootstrap = await this.writenow.invokeResponse('project:bootstrap', {});
            if (!bootstrap.ok) {
                this.messageService.error(`${bootstrap.error.code}: ${bootstrap.error.message}`);
                return;
            }

            const projectId = bootstrap.data.currentProjectId;
            const created = await this.writenow.invokeResponse('kg:entity:create', {
                projectId,
                type: 'Character',
                name,
            });
            if (!created.ok) {
                this.messageService.error(`${created.error.code}: ${created.error.message}`);
                return;
            }

            this.messageService.info(`Created entity: ${created.data.entity.name}`);
            await this.openWidget({ activate: true });
        } catch (error) {
            this.messageService.error(`Create entity failed: ${formatError(error)}`);
        }
    }
}
