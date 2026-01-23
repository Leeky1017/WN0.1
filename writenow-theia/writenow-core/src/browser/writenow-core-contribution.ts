import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WritenowFrontendService } from './writenow-frontend-service';

export const WRITENOW_CORE_HELLO_COMMAND: Command = {
    id: 'writenow.core.hello',
    label: 'WriteNow: Hello'
};

export const WRITENOW_CORE_OPEN_INLINE_AI_COMMAND: Command = {
    id: 'writenow.core.openInlineAI',
    label: 'WriteNow: Open Inline AI',
};

export const WRITENOW_CORE_RPC_SMOKE_COMMAND: Command = {
    id: 'writenow.core.rpcSmoke',
    label: 'WriteNow: RPC Smoke',
};

@injectable()
export class WritenowCoreContribution implements CommandContribution, MenuContribution, FrontendApplicationContribution {
    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
    ) {}

    /**
     * Why: The scaffold needs a visible signal that our custom frontend contribution is loaded.
     */
    onStart(): void {
        // eslint-disable-next-line no-console
        console.info('[writenow-core] frontend started');
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WRITENOW_CORE_HELLO_COMMAND, {
            execute: () => this.messageService.info('WriteNow core extension is loaded.'),
        });

        registry.registerCommand(WRITENOW_CORE_OPEN_INLINE_AI_COMMAND, {
            execute: () =>
                this.messageService.info(
                    'Inline AI is not implemented yet (Phase 1). This command is reserved to avoid Ctrl/Cmd+K chord conflicts while editing.',
                ),
        });

        registry.registerCommand(WRITENOW_CORE_RPC_SMOKE_COMMAND, {
            execute: async () => {
                const startedAt = Date.now();
                try {
                    const bootstrap = await this.writenow.invoke('project:bootstrap', {});
                    const projects = await this.writenow.invoke('project:list', {});

                    const created = await this.writenow.invoke('file:create', { name: 'RPC Smoke' });
                    const content = `# RPC Smoke\n\n- at: ${new Date().toISOString()}\n- projectId: ${bootstrap.currentProjectId}\n`;

                    await this.writenow.invoke('file:write', { path: created.path, content });
                    const read = await this.writenow.invoke('file:read', { path: created.path });

                    await this.writenow.invoke('file:snapshot:write', {
                        path: created.path,
                        content: read.content,
                        reason: 'manual',
                    });
                    const latest = await this.writenow.invoke('file:snapshot:latest', { path: created.path });

                    const elapsedMs = Date.now() - startedAt;
                    this.messageService.info(
                        `RPC ok (elapsed: ${elapsedMs}ms): projects=${projects.projects.length}, file=${created.path}, snapshot=${latest.snapshot ? latest.snapshot.id : 'none'}`,
                    );
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`RPC smoke failed: ${message}`);
                }
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: WRITENOW_CORE_HELLO_COMMAND.id,
            label: WRITENOW_CORE_HELLO_COMMAND.label,
        });
    }
}
