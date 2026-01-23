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
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
                data-testid="writenow-welcome"
            >
                <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>WriteNow</div>
                    <div style={{ opacity: 0.8, fontSize: 14 }}>Creator IDE — write in Markdown, think in projects.</div>
                </header>

                <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <button
                        type="button"
                        className="theia-button"
                        onClick={() => this.safeExecute('workspace:openFolder')}
                        data-testid="writenow-welcome-open-folder"
                    >
                        Open Folder
                    </button>
                    <button
                        type="button"
                        className="theia-button"
                        onClick={() => this.safeExecute('workspace:openFile')}
                        data-testid="writenow-welcome-open-file"
                    >
                        Open File
                    </button>
                    <button
                        type="button"
                        className="theia-button"
                        onClick={() => this.safeExecute('preferences:open')}
                        data-testid="writenow-welcome-open-settings"
                    >
                        Settings
                    </button>
                </section>

                <section style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600 }}>What’s ready in Phase 1</div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <li>Explorer + workspace browsing</li>
                        <li>TipTap-based Markdown editor for <code>.md</code> (save/dirty)</li>
                        <li>Right-side AI Panel placeholder slot</li>
                    </ul>
                </section>

                <footer style={{ marginTop: 'auto', opacity: 0.65, fontSize: 12 }}>
                    This welcome page is a Phase 1 scaffold. Replace with the real onboarding later.
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
