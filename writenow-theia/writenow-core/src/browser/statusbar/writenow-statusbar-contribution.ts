import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ActiveEditorService } from '../active-editor-service';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { AiPanelService } from '../ai-panel/ai-panel-service';

/**
 * Status bar item IDs.
 */
const STATUSBAR_WORD_COUNT_ID = 'writenow.statusbar.wordCount';
const STATUSBAR_AI_STATUS_ID = 'writenow.statusbar.aiStatus';

/**
 * Why: Format number with thousand separators for Chinese locale.
 */
function formatWordCount(count: number): string {
    return count.toLocaleString('zh-CN');
}

/**
 * Why: Debounce function to prevent excessive updates.
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return ((...args: unknown[]) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    }) as T;
}

type AiConnectionStatus = 'connected' | 'disconnected' | 'requesting';

/**
 * WriteNow StatusBar Contribution.
 *
 * Why: Provides word count and AI status indicators in the status bar.
 * These are core UX elements for a writing IDE.
 */
@injectable()
export class WritenowStatusbarContribution implements FrontendApplicationContribution, Disposable {
    private readonly disposables = new DisposableCollection();
    private updateWordCountDebounced: () => void;

    constructor(
        @inject(StatusBar) private readonly statusBar: StatusBar,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(AiPanelService) private readonly aiPanel: AiPanelService,
    ) {
        // Why: Debounce word count updates to 500ms to prevent excessive IPC calls
        this.updateWordCountDebounced = debounce(() => {
            void this.updateWordCount();
        }, 500);
    }

    async onStart(): Promise<void> {
        // Register status bar items
        this.registerWordCountItem();
        this.registerAiStatusItem();

        // Listen to editor changes
        this.disposables.push(
            this.activeEditor.onDidChange(() => {
                this.updateWordCountDebounced();
            })
        );

        // Listen to content changes in active editor
        const setupContentListener = (): void => {
            const editor = this.activeEditor.getActive();
            if (editor) {
                this.disposables.push(
                    editor.onContentChanged(() => {
                        this.updateWordCountDebounced();
                    })
                );
            }
        };

        this.disposables.push(
            this.activeEditor.onDidChange(() => {
                setupContentListener();
            })
        );

        setupContentListener();

        // Listen to AI panel stream events for status updates
        this.disposables.push(
            this.aiPanel.onDidReceiveStreamEvent((event) => {
                if (event.type === 'delta') {
                    this.setAiStatus('requesting');
                } else if (event.type === 'done') {
                    this.setAiStatus('connected');
                } else if (event.type === 'error') {
                    this.setAiStatus('disconnected');
                }
            })
        );

        // Initial word count
        void this.updateWordCount();
        
        // Check AI connection status
        void this.checkAiConnection();
    }

    dispose(): void {
        this.disposables.dispose();
        this.statusBar.removeElement(STATUSBAR_WORD_COUNT_ID);
        this.statusBar.removeElement(STATUSBAR_AI_STATUS_ID);
    }

    private registerWordCountItem(): void {
        this.statusBar.setElement(STATUSBAR_WORD_COUNT_ID, {
            text: `$(pencil) 0 字`,
            alignment: StatusBarAlignment.RIGHT,
            priority: 100,
            tooltip: '当前文档字数',
        });
    }

    private registerAiStatusItem(): void {
        this.statusBar.setElement(STATUSBAR_AI_STATUS_ID, {
            text: `$(circle-slash) AI 未连接`,
            alignment: StatusBarAlignment.RIGHT,
            priority: 99,
            tooltip: 'AI 服务连接状态',
        });
    }

    private async updateWordCount(): Promise<void> {
        const editor = this.activeEditor.getActive();
        if (!editor) {
            this.setWordCount(0);
            return;
        }

        const markdown = editor.getMarkdown();
        // Why: Simple Chinese-aware word count - count characters (excluding whitespace and markdown syntax)
        // For more accurate stats, we could call the backend stats IPC
        const text = markdown
            .replace(/#+\s*/g, '') // Remove heading markers
            .replace(/[*_~`]/g, '') // Remove formatting markers
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Extract link text
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // Extract image alt text
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]*`/g, '') // Remove inline code
            .replace(/\s+/g, ''); // Remove whitespace

        this.setWordCount(text.length);
    }

    private setWordCount(count: number): void {
        this.statusBar.setElement(STATUSBAR_WORD_COUNT_ID, {
            text: `$(pencil) ${formatWordCount(count)} 字`,
            alignment: StatusBarAlignment.RIGHT,
            priority: 100,
            tooltip: `当前文档字数：${formatWordCount(count)}`,
        });
    }

    private async checkAiConnection(): Promise<void> {
        try {
            const res = await this.writenow.invokeResponse('memory:settings:get', {});
            if (res.ok) {
                this.setAiStatus('connected');
            } else {
                this.setAiStatus('disconnected');
            }
        } catch {
            this.setAiStatus('disconnected');
        }
    }

    private setAiStatus(status: AiConnectionStatus): void {
        let icon: string;
        let text: string;
        let tooltip: string;
        let className: string;

        switch (status) {
            case 'connected':
                icon = '$(pass-filled)';
                text = 'AI 已连接';
                tooltip = 'AI 服务已连接';
                className = 'wn-statusbar-ai--connected';
                break;
            case 'requesting':
                icon = '$(sync~spin)';
                text = 'AI 请求中';
                tooltip = 'AI 正在处理请求';
                className = 'wn-statusbar-ai--requesting';
                break;
            case 'disconnected':
            default:
                icon = '$(circle-slash)';
                text = 'AI 未连接';
                tooltip = 'AI 服务未连接，请检查 API Key 配置';
                className = 'wn-statusbar-ai--disconnected';
                break;
        }

        this.statusBar.setElement(STATUSBAR_AI_STATUS_ID, {
            text: `${icon} ${text}`,
            alignment: StatusBarAlignment.RIGHT,
            priority: 99,
            tooltip,
            className,
        });
    }
}
