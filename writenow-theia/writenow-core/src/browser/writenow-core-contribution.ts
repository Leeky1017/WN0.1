import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser/common-menus';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WritenowFrontendService } from './writenow-frontend-service';
import { ActiveEditorService } from './active-editor-service';
import { TipTapMarkdownEditorWidget } from './tiptap-markdown-editor-widget';

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

// P1-004: Export commands
export const WRITENOW_EXPORT_MARKDOWN_COMMAND: Command = {
    id: 'writenow.export.markdown',
    label: 'WriteNow: 导出 Markdown',
    category: 'WriteNow',
};

export const WRITENOW_EXPORT_WORD_COMMAND: Command = {
    id: 'writenow.export.word',
    label: 'WriteNow: 导出 Word',
    category: 'WriteNow',
};

export const WRITENOW_EXPORT_PDF_COMMAND: Command = {
    id: 'writenow.export.pdf',
    label: 'WriteNow: 导出 PDF',
    category: 'WriteNow',
};

// P1-010: Focus mode command
export const WRITENOW_FOCUS_MODE_COMMAND: Command = {
    id: 'writenow.focusMode.toggle',
    label: 'WriteNow: 切换专注模式',
    category: 'WriteNow',
};

// P1-008: Notification toggle command
export const WRITENOW_NOTIFICATION_TOGGLE_COMMAND: Command = {
    id: 'writenow.notification.toggle',
    label: 'WriteNow: 通知中心',
    category: 'WriteNow',
};

@injectable()
export class WritenowCoreContribution implements CommandContribution, MenuContribution, KeybindingContribution, FrontendApplicationContribution {
    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
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

                    const v1 = await this.writenow.invoke('version:create', {
                        articleId: created.path,
                        content: read.content,
                        name: 'smoke v1',
                        actor: 'user',
                    });

                    const contentV2 = `${read.content}\n\n- v2: ${new Date().toISOString()}\n`;
                    await this.writenow.invoke('file:write', { path: created.path, content: contentV2 });
                    const v2 = await this.writenow.invoke('version:create', {
                        articleId: created.path,
                        content: contentV2,
                        name: 'smoke v2',
                        actor: 'user',
                    });

                    const diff = await this.writenow.invoke('version:diff', {
                        fromSnapshotId: v1.snapshotId,
                        toSnapshotId: v2.snapshotId,
                    });

                    const elapsedMs = Date.now() - startedAt;
                    this.messageService.info(
                        `RPC ok (elapsed: ${elapsedMs}ms): projects=${projects.projects.length}, file=${created.path}, versionDiff=${diff.diff.length} chars`,
                    );
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`RPC smoke failed: ${message}`);
                }
            },
        });

        // P1-004: Export commands
        registry.registerCommand(WRITENOW_EXPORT_MARKDOWN_COMMAND, {
            execute: async () => {
                const editor = this.activeEditor.getActive();
                if (!editor) {
                    this.messageService.warn('请先打开一个文档');
                    return;
                }
                const title = editor.getArticleId() ?? '未命名';
                const content = editor.getMarkdown();
                if (!content.trim()) {
                    this.messageService.warn('文档内容为空');
                    return;
                }
                try {
                    const result = await this.writenow.invokeResponse('export:markdown', { title, content });
                    if (result.ok) {
                        this.messageService.info(`已导出: ${result.data.path}`);
                    } else {
                        this.messageService.error(`导出失败: ${result.error.message}`);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`导出失败: ${message}`);
                }
            },
        });

        registry.registerCommand(WRITENOW_EXPORT_WORD_COMMAND, {
            execute: async () => {
                const editor = this.activeEditor.getActive();
                if (!editor) {
                    this.messageService.warn('请先打开一个文档');
                    return;
                }
                const title = editor.getArticleId() ?? '未命名';
                const content = editor.getMarkdown();
                if (!content.trim()) {
                    this.messageService.warn('文档内容为空');
                    return;
                }
                try {
                    const result = await this.writenow.invokeResponse('export:docx', { title, content });
                    if (result.ok) {
                        this.messageService.info(`已导出: ${result.data.path}`);
                    } else {
                        this.messageService.error(`导出失败: ${result.error.message}`);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`导出失败: ${message}`);
                }
            },
        });

        registry.registerCommand(WRITENOW_EXPORT_PDF_COMMAND, {
            execute: async () => {
                const editor = this.activeEditor.getActive();
                if (!editor) {
                    this.messageService.warn('请先打开一个文档');
                    return;
                }
                const title = editor.getArticleId() ?? '未命名';
                const content = editor.getMarkdown();
                if (!content.trim()) {
                    this.messageService.warn('文档内容为空');
                    return;
                }
                try {
                    const result = await this.writenow.invokeResponse('export:pdf', { title, content });
                    if (result.ok) {
                        this.messageService.info(`已导出: ${result.data.path}`);
                    } else {
                        this.messageService.error(`导出失败: ${result.error.message}`);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`导出失败: ${message}`);
                }
            },
        });

        // P1-010: Focus mode toggle
        registry.registerCommand(WRITENOW_FOCUS_MODE_COMMAND, {
            execute: () => {
                const editor = this.activeEditor.getActive();
                if (editor && editor instanceof TipTapMarkdownEditorWidget) {
                    (editor as TipTapMarkdownEditorWidget).toggleFocusMode();
                } else {
                    this.messageService.warn('请先打开一个文档');
                }
            },
        });

        // P1-008: Notification toggle (placeholder, actual implementation in NotificationContribution)
        registry.registerCommand(WRITENOW_NOTIFICATION_TOGGLE_COMMAND, {
            execute: () => {
                // This will be handled by NotificationContribution
            },
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.HELP, {
            commandId: WRITENOW_CORE_HELLO_COMMAND.id,
            label: WRITENOW_CORE_HELLO_COMMAND.label,
        });

        // P1-004: Export submenu
        const EXPORT_SUBMENU = [...CommonMenus.FILE, 'export'];
        menus.registerSubmenu(EXPORT_SUBMENU, '导出');

        menus.registerMenuAction(EXPORT_SUBMENU, {
            commandId: WRITENOW_EXPORT_MARKDOWN_COMMAND.id,
            label: 'Markdown (.md)',
            order: 'a1',
        });

        menus.registerMenuAction(EXPORT_SUBMENU, {
            commandId: WRITENOW_EXPORT_WORD_COMMAND.id,
            label: 'Word (.docx)',
            order: 'a2',
        });

        menus.registerMenuAction(EXPORT_SUBMENU, {
            commandId: WRITENOW_EXPORT_PDF_COMMAND.id,
            label: 'PDF (.pdf)',
            order: 'a3',
        });

        // P1-010: Focus mode in View menu
        menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
            commandId: WRITENOW_FOCUS_MODE_COMMAND.id,
            label: '专注模式',
            order: 'z9',
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        // P1-010: Focus mode shortcut
        registry.registerKeybinding({
            command: WRITENOW_FOCUS_MODE_COMMAND.id,
            keybinding: 'ctrlcmd+shift+f',
        });
    }
}
