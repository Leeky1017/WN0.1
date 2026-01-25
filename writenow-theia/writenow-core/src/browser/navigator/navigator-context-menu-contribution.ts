import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, MessageService } from '@theia/core';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser/keybinding';
import { inject, injectable } from '@theia/core/shared/inversify';
import { UriSelection } from '@theia/core/lib/common/selection';
import { SelectionService } from '@theia/core/lib/common/selection-service';
import URI from '@theia/core/lib/common/uri';

import { FileService } from '@theia/filesystem/lib/browser/file-service';

/**
 * Navigator context menu IDs.
 *
 * Why: Theia uses menu paths to organize context menu items.
 * We register our items into the navigator context menu.
 */
export const NAVIGATOR_CONTEXT_MENU = ['navigator-context-menu'];
export const NAVIGATOR_CONTEXT_MENU_NEW = [...NAVIGATOR_CONTEXT_MENU, '1_new'];
export const NAVIGATOR_CONTEXT_MENU_EDIT = [...NAVIGATOR_CONTEXT_MENU, '2_edit'];
export const NAVIGATOR_CONTEXT_MENU_CLIPBOARD = [...NAVIGATOR_CONTEXT_MENU, '3_clipboard'];

/**
 * WriteNow Navigator Commands.
 */
export const WRITENOW_NAV_NEW_FILE: Command = {
    id: 'writenow.navigator.newFile',
    label: '新建文件',
    category: 'WriteNow',
};

export const WRITENOW_NAV_NEW_FOLDER: Command = {
    id: 'writenow.navigator.newFolder',
    label: '新建文件夹',
    category: 'WriteNow',
};

export const WRITENOW_NAV_RENAME: Command = {
    id: 'writenow.navigator.rename',
    label: '重命名',
    category: 'WriteNow',
};

export const WRITENOW_NAV_DELETE: Command = {
    id: 'writenow.navigator.delete',
    label: '删除',
    category: 'WriteNow',
};

export const WRITENOW_NAV_COPY_PATH: Command = {
    id: 'writenow.navigator.copyPath',
    label: '复制路径',
    category: 'WriteNow',
};

export const WRITENOW_NAV_COPY_RELATIVE_PATH: Command = {
    id: 'writenow.navigator.copyRelativePath',
    label: '复制相对路径',
    category: 'WriteNow',
};

/**
 * Get URI from selection.
 */
function getUriFromSelection(selectionService: SelectionService): URI | undefined {
    const selection = selectionService.selection;
    if (UriSelection.is(selection)) {
        return selection.uri;
    }
    if (Array.isArray(selection) && selection.length > 0 && UriSelection.is(selection[0])) {
        return selection[0].uri;
    }
    return undefined;
}

/**
 * NavigatorContextMenuContribution - File tree right-click menu.
 *
 * Why: Provides essential file operations in the navigator context menu.
 * This is a core UX feature for file management.
 */
@injectable()
export class NavigatorContextMenuContribution implements CommandContribution, MenuContribution, KeybindingContribution {
    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(SelectionService) private readonly selectionService: SelectionService,
        @inject(FileService) private readonly fileService: FileService,
    ) {}

    registerCommands(registry: CommandRegistry): void {
        // New File
        registry.registerCommand(WRITENOW_NAV_NEW_FILE, {
            execute: async () => {
                const uri = getUriFromSelection(this.selectionService);
                if (!uri) {
                    this.messageService.warn('请先选择一个文件夹');
                    return;
                }

                // Determine parent directory
                const stat = await this.fileService.resolve(uri);
                const parentUri = stat.isDirectory ? uri : uri.parent;

                const name = await this.promptFileName('新建文件', '未命名.md');
                if (!name) return;

                const newUri = parentUri.resolve(name);
                try {
                    await this.fileService.create(newUri, '');
                    this.messageService.info(`已创建: ${name}`);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`创建失败: ${message}`);
                }
            },
            isEnabled: () => Boolean(getUriFromSelection(this.selectionService)),
            isVisible: () => Boolean(getUriFromSelection(this.selectionService)),
        });

        // New Folder
        registry.registerCommand(WRITENOW_NAV_NEW_FOLDER, {
            execute: async () => {
                const uri = getUriFromSelection(this.selectionService);
                if (!uri) {
                    this.messageService.warn('请先选择一个文件夹');
                    return;
                }

                const stat = await this.fileService.resolve(uri);
                const parentUri = stat.isDirectory ? uri : uri.parent;

                const name = await this.promptFileName('新建文件夹', '新文件夹');
                if (!name) return;

                const newUri = parentUri.resolve(name);
                try {
                    await this.fileService.createFolder(newUri);
                    this.messageService.info(`已创建文件夹: ${name}`);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`创建失败: ${message}`);
                }
            },
            isEnabled: () => Boolean(getUriFromSelection(this.selectionService)),
            isVisible: () => Boolean(getUriFromSelection(this.selectionService)),
        });

        // Rename
        registry.registerCommand(WRITENOW_NAV_RENAME, {
            execute: async () => {
                const uri = getUriFromSelection(this.selectionService);
                if (!uri) return;

                const oldName = uri.path.base;
                const newName = await this.promptFileName('重命名', oldName);
                if (!newName || newName === oldName) return;

                const newUri = uri.parent.resolve(newName);
                try {
                    await this.fileService.move(uri, newUri);
                    this.messageService.info(`已重命名为: ${newName}`);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`重命名失败: ${message}`);
                }
            },
            isEnabled: () => Boolean(getUriFromSelection(this.selectionService)),
            isVisible: () => Boolean(getUriFromSelection(this.selectionService)),
        });

        // Delete
        registry.registerCommand(WRITENOW_NAV_DELETE, {
            execute: async () => {
                const uri = getUriFromSelection(this.selectionService);
                if (!uri) return;

                const name = uri.path.base;
                const confirmed = await this.confirmDelete(name);
                if (!confirmed) return;

                try {
                    await this.fileService.delete(uri, { recursive: true });
                    this.messageService.info(`已删除: ${name}`);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`删除失败: ${message}`);
                }
            },
            isEnabled: () => Boolean(getUriFromSelection(this.selectionService)),
            isVisible: () => Boolean(getUriFromSelection(this.selectionService)),
        });

        // Copy Path
        registry.registerCommand(WRITENOW_NAV_COPY_PATH, {
            execute: async () => {
                const uri = getUriFromSelection(this.selectionService);
                if (!uri) return;

                const path = uri.path.fsPath();
                await this.copyToClipboard(path);
                this.messageService.info('已复制路径');
            },
            isEnabled: () => Boolean(getUriFromSelection(this.selectionService)),
            isVisible: () => Boolean(getUriFromSelection(this.selectionService)),
        });

        // Copy Relative Path
        registry.registerCommand(WRITENOW_NAV_COPY_RELATIVE_PATH, {
            execute: async () => {
                const uri = getUriFromSelection(this.selectionService);
                if (!uri) return;

                // For simplicity, use the base name as relative path
                // In a full implementation, this would be relative to workspace root
                const path = uri.path.base;
                await this.copyToClipboard(path);
                this.messageService.info('已复制相对路径');
            },
            isEnabled: () => Boolean(getUriFromSelection(this.selectionService)),
            isVisible: () => Boolean(getUriFromSelection(this.selectionService)),
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        // New submenu
        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU_NEW, {
            commandId: WRITENOW_NAV_NEW_FILE.id,
            label: '新建文件',
            order: 'a1',
        });

        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU_NEW, {
            commandId: WRITENOW_NAV_NEW_FOLDER.id,
            label: '新建文件夹',
            order: 'a2',
        });

        // Edit submenu
        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU_EDIT, {
            commandId: WRITENOW_NAV_RENAME.id,
            label: '重命名',
            order: 'b1',
        });

        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU_EDIT, {
            commandId: WRITENOW_NAV_DELETE.id,
            label: '删除',
            order: 'b2',
        });

        // Clipboard submenu
        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU_CLIPBOARD, {
            commandId: WRITENOW_NAV_COPY_PATH.id,
            label: '复制路径',
            order: 'c1',
        });

        menus.registerMenuAction(NAVIGATOR_CONTEXT_MENU_CLIPBOARD, {
            commandId: WRITENOW_NAV_COPY_RELATIVE_PATH.id,
            label: '复制相对路径',
            order: 'c2',
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        registry.registerKeybinding({
            command: WRITENOW_NAV_RENAME.id,
            keybinding: 'F2',
            when: 'filesExplorerFocus',
        });

        registry.registerKeybinding({
            command: WRITENOW_NAV_DELETE.id,
            keybinding: 'Delete',
            when: 'filesExplorerFocus',
        });
    }

    /**
     * Prompt for file/folder name.
     */
    private async promptFileName(title: string, defaultValue: string): Promise<string | undefined> {
        // Use browser prompt for simplicity; in production use Theia's dialog service
        const result = window.prompt(title, defaultValue);
        return result?.trim() || undefined;
    }

    /**
     * Confirm deletion.
     */
    private async confirmDelete(name: string): Promise<boolean> {
        // Use browser confirm for simplicity; in production use Theia's dialog service
        return window.confirm(`确定要删除 "${name}" 吗？此操作不可撤销。`);
    }

    /**
     * Copy text to clipboard using modern Clipboard API.
     */
    private async copyToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback for older browsers or security restrictions
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }
}
