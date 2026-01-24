import * as React from '@theia/core/shared/react';

import { codicon } from '@theia/core/lib/browser/widgets';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { CommandService } from '@theia/core/lib/common/command';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WritenowFrontendService } from './writenow-frontend-service';
import { WRITENOW_WELCOME_WIDGET_ID } from './writenow-layout-ids';

/**
 * Recent file entry.
 */
type RecentFile = {
    path: string;
    name: string;
    openedAt: string;
};

/**
 * Storage key for recent files in localStorage.
 */
const RECENT_FILES_KEY = 'writenow.recentFiles';
const MAX_RECENT_FILES = 10;

/**
 * Load recent files from localStorage.
 */
function loadRecentFiles(): RecentFile[] {
    try {
        const stored = localStorage.getItem(RECENT_FILES_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, MAX_RECENT_FILES);
    } catch {
        return [];
    }
}

/**
 * Save recent files to localStorage.
 */
function saveRecentFiles(files: RecentFile[]): void {
    try {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files.slice(0, MAX_RECENT_FILES)));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Add a file to recent files.
 */
export function addToRecentFiles(path: string, name: string): void {
    const files = loadRecentFiles();
    const filtered = files.filter((f) => f.path !== path);
    const newFile: RecentFile = {
        path,
        name,
        openedAt: new Date().toISOString(),
    };
    saveRecentFiles([newFile, ...filtered]);
}

type WelcomeViewProps = Readonly<{
    commandService: CommandService;
    messageService: MessageService;
    writenow: WritenowFrontendService;
}>;

/**
 * Welcome view React component.
 */
function WelcomeView(props: WelcomeViewProps): React.ReactElement {
    const { commandService, messageService } = props;
    const [recentFiles, setRecentFiles] = React.useState<RecentFile[]>([]);

    // Load recent files on mount
    React.useEffect(() => {
        setRecentFiles(loadRecentFiles());
    }, []);

    const safeExecute = async (commandId: string): Promise<void> => {
        try {
            await commandService.executeCommand(commandId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            messageService.error(`执行命令失败 '${commandId}': ${message}`);
        }
    };

    const openRecentFile = async (file: RecentFile): Promise<void> => {
        try {
            // Use Theia's open command with the file URI
            await commandService.executeCommand('core.openResource', file.path);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            messageService.error(`打开文件失败: ${message}`);
        }
    };

    const clearRecentFiles = (): void => {
        saveRecentFiles([]);
        setRecentFiles([]);
    };

    const formatDate = (dateStr: string): string => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) return '今天';
            if (days === 1) return '昨天';
            if (days < 7) return `${days} 天前`;
            return date.toLocaleDateString('zh-CN');
        } catch {
            return '';
        }
    };

    return (
        <div className="wn-welcome-container" data-testid="writenow-welcome">
            {/* Header */}
            <header className="wn-welcome-header">
                <h1 className="wn-welcome-title">WriteNow</h1>
                <p className="wn-welcome-tagline">Creator IDE</p>
            </header>

            {/* Main content - two columns on larger screens */}
            <div className="wn-welcome-main">
                {/* Left column - Actions */}
                <section className="wn-welcome-column">
                    <h2 className="wn-welcome-section-title">开始</h2>
                    <div className="wn-welcome-actions">
                        <button
                            type="button"
                            className="wn-welcome-action wn-welcome-action--primary"
                            onClick={() => safeExecute('workspace:openFolder')}
                            data-testid="writenow-welcome-open-folder"
                        >
                            <span className={codicon('folder-opened') + ' wn-welcome-action-icon'} />
                            打开文件夹
                        </button>
                        <button
                            type="button"
                            className="wn-welcome-action"
                            onClick={() => safeExecute('workspace:openFile')}
                            data-testid="writenow-welcome-open-file"
                        >
                            <span className={codicon('file') + ' wn-welcome-action-icon'} />
                            打开文件
                        </button>
                        <button
                            type="button"
                            className="wn-welcome-action"
                            onClick={() => safeExecute('writenow.settings.open')}
                            data-testid="writenow-welcome-open-settings"
                        >
                            <span className={codicon('gear') + ' wn-welcome-action-icon'} />
                            设置
                        </button>
                    </div>

                    {/* Shortcuts hint */}
                    <div className="wn-welcome-shortcuts">
                        <h3 className="wn-welcome-shortcuts-title">快捷键</h3>
                        <div className="wn-welcome-shortcut">
                            <kbd>⌘K</kbd>
                            <span>AI 助手</span>
                        </div>
                        <div className="wn-welcome-shortcut">
                            <kbd>⌘,</kbd>
                            <span>设置</span>
                        </div>
                        <div className="wn-welcome-shortcut">
                            <kbd>⌘S</kbd>
                            <span>保存</span>
                        </div>
                    </div>
                </section>

                {/* Right column - Recent files */}
                <section className="wn-welcome-column">
                    <div className="wn-welcome-section-header">
                        <h2 className="wn-welcome-section-title">最近文件</h2>
                        {recentFiles.length > 0 && (
                            <button
                                type="button"
                                className="wn-welcome-clear-btn"
                                onClick={clearRecentFiles}
                            >
                                清除
                            </button>
                        )}
                    </div>
                    
                    {recentFiles.length > 0 ? (
                        <ul className="wn-welcome-recent-list">
                            {recentFiles.map((file) => (
                                <li key={file.path} className="wn-welcome-recent-item">
                                    <button
                                        type="button"
                                        className="wn-welcome-recent-btn"
                                        onClick={() => openRecentFile(file)}
                                    >
                                        <span className={codicon('file') + ' wn-welcome-recent-icon'} />
                                        <span className="wn-welcome-recent-name">{file.name}</span>
                                        <span className="wn-welcome-recent-time">{formatDate(file.openedAt)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="wn-welcome-empty">
                            暂无最近打开的文件
                        </p>
                    )}
                </section>
            </div>

            {/* Features section */}
            <section className="wn-welcome-features">
                <h2 className="wn-welcome-features-title">功能亮点</h2>
                <ul className="wn-welcome-features-list">
                    <li className="wn-welcome-feature">
                        <div className="wn-welcome-feature-icon">
                            <span className={codicon('sparkle')} />
                        </div>
                        <div className="wn-welcome-feature-content">
                            <h3 className="wn-welcome-feature-name">AI 写作助手</h3>
                            <p className="wn-welcome-feature-desc">
                                按 ⌘K 打开 AI 面板，获取智能写作建议。
                            </p>
                        </div>
                    </li>
                    <li className="wn-welcome-feature">
                        <div className="wn-welcome-feature-icon">
                            <span className={codicon('edit')} />
                        </div>
                        <div className="wn-welcome-feature-content">
                            <h3 className="wn-welcome-feature-name">Markdown 编辑器</h3>
                            <p className="wn-welcome-feature-desc">
                                所见即所得的 Markdown 编辑，支持自动保存。
                            </p>
                        </div>
                    </li>
                    <li className="wn-welcome-feature">
                        <div className="wn-welcome-feature-icon">
                            <span className={codicon('history')} />
                        </div>
                        <div className="wn-welcome-feature-content">
                            <h3 className="wn-welcome-feature-name">版本历史</h3>
                            <p className="wn-welcome-feature-desc">
                                自动保存每次编辑，随时回溯历史版本。
                            </p>
                        </div>
                    </li>
                </ul>
            </section>

            {/* Footer */}
            <footer className="wn-welcome-footer">
                <p className="wn-welcome-footer-text">
                    WriteNow — 创作者的 IDE
                </p>
            </footer>
        </div>
    );
}

@injectable()
export class WritenowWelcomeWidget extends ReactWidget {
    static readonly ID = WRITENOW_WELCOME_WIDGET_ID;

    constructor(
        @inject(CommandService) private readonly commandService: CommandService,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
    ) {
        super();
        this.id = WritenowWelcomeWidget.ID;
        this.title.label = 'Welcome';
        this.title.caption = 'WriteNow Welcome';
        this.title.iconClass = codicon('home');
        this.title.closable = true;
        this.addClass('writenow-welcome');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <WelcomeView
                commandService={this.commandService}
                messageService={this.messageService}
                writenow={this.writenow}
            />
        );
    }
}
