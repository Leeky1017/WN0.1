import * as React from '@theia/core/shared/react';

import { codicon } from '@theia/core/lib/browser/widgets';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { CommandService } from '@theia/core/lib/common/command';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WRITENOW_WELCOME_WIDGET_ID } from './writenow-layout-ids';

@injectable()
export class WritenowWelcomeWidget extends ReactWidget {
    static readonly ID = WRITENOW_WELCOME_WIDGET_ID;

    constructor(
        @inject(CommandService) private readonly commandService: CommandService,
        @inject(MessageService) private readonly messageService: MessageService,
    ) {
        super();
        this.id = WritenowWelcomeWidget.ID;
        this.title.label = 'Welcome';
        this.title.caption = 'WriteNow Welcome';
        this.title.iconClass = codicon('home');
        this.title.closable = true;
        this.addClass('writenow-welcome');

        // Why: The welcome view is mostly static; it only needs an initial render.
        this.update();
    }

    /**
     * Why: The welcome page should provide stable entrypoints into the main user journey
     * (open/create) without depending on Theia default IDE affordances.
     */
    protected override render(): React.ReactNode {
        return (
            <div className="wn-welcome-container" data-testid="writenow-welcome">
                {/* Header with brand */}
                <header className="wn-welcome-header">
                    <div className="wn-welcome-logo">
                        <span className="wn-welcome-logo-icon">W</span>
                    </div>
                    <h1 className="wn-welcome-title">WriteNow</h1>
                    <p className="wn-welcome-tagline">
                        Creator IDE — write in Markdown, think in projects.
                    </p>
                </header>

                {/* Quick action buttons */}
                <section className="wn-welcome-actions">
                    <button
                        type="button"
                        className="wn-welcome-action wn-welcome-action--primary"
                        onClick={() => this.safeExecute('workspace:openFolder')}
                        data-testid="writenow-welcome-open-folder"
                    >
                        <span className={codicon('folder-opened') + ' wn-welcome-action-icon'} />
                        Open Folder
                    </button>
                    <button
                        type="button"
                        className="wn-welcome-action"
                        onClick={() => this.safeExecute('workspace:openFile')}
                        data-testid="writenow-welcome-open-file"
                    >
                        <span className={codicon('file') + ' wn-welcome-action-icon'} />
                        Open File
                    </button>
                    <button
                        type="button"
                        className="wn-welcome-action"
                        onClick={() => this.safeExecute('preferences:open')}
                        data-testid="writenow-welcome-open-settings"
                    >
                        <span className={codicon('gear') + ' wn-welcome-action-icon'} />
                        Settings
                    </button>
                </section>

                {/* Features section */}
                <section className="wn-welcome-features">
                    <h2 className="wn-welcome-features-title">What's ready</h2>
                    <ul className="wn-welcome-features-list">
                        <li className="wn-welcome-feature">
                            <div className="wn-welcome-feature-icon">
                                <span className={codicon('files')} />
                            </div>
                            <div className="wn-welcome-feature-content">
                                <h3 className="wn-welcome-feature-name">Explorer + Workspace</h3>
                                <p className="wn-welcome-feature-desc">
                                    Browse and manage your writing projects with a familiar file tree.
                                </p>
                            </div>
                        </li>
                        <li className="wn-welcome-feature">
                            <div className="wn-welcome-feature-icon">
                                <span className={codicon('edit')} />
                            </div>
                            <div className="wn-welcome-feature-content">
                                <h3 className="wn-welcome-feature-name">Markdown Editor</h3>
                                <p className="wn-welcome-feature-desc">
                                    Rich TipTap-based editor with auto-save and Markdown support.
                                </p>
                            </div>
                        </li>
                        <li className="wn-welcome-feature">
                            <div className="wn-welcome-feature-icon">
                                <span className={codicon('sparkle')} />
                            </div>
                            <div className="wn-welcome-feature-content">
                                <h3 className="wn-welcome-feature-name">AI Assistant</h3>
                                <p className="wn-welcome-feature-desc">
                                    Context-aware AI panel for writing assistance and editing.
                                </p>
                            </div>
                        </li>
                    </ul>
                </section>

                {/* Footer */}
                <footer className="wn-welcome-footer">
                    <p className="wn-welcome-footer-text">
                        WriteNow — Your creative writing IDE
                    </p>
                </footer>
            </div>
        );
    }

    private async safeExecute(commandId: string): Promise<void> {
        try {
            await this.commandService.executeCommand(commandId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.messageService.error(`Failed to execute command '${commandId}': ${message}`);
        }
    }
}
