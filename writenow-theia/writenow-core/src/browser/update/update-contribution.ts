import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WritenowFrontendService } from '../writenow-frontend-service';

/**
 * Update notification contribution (P2-008).
 *
 * Why: Check for updates on startup and notify users when a new version is available.
 */
@injectable()
export class UpdateContribution implements FrontendApplicationContribution {
    @inject(WritenowFrontendService)
    protected readonly frontendService!: WritenowFrontendService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    private notificationElement: HTMLElement | null = null;

    async onStart(_app: FrontendApplication): Promise<void> {
        // Delay update check to not slow down startup
        setTimeout(() => {
            void this.checkForUpdates();
        }, 5000);
    }

    /**
     * Check for updates and show notification if available.
     */
    private async checkForUpdates(): Promise<void> {
        try {
            const res = await this.frontendService.invokeResponse('update:check', {});

            if (!res.ok) {
                console.debug('[Update] Check failed:', res.error.message);
                return;
            }

            if (res.data.available && res.data.latest) {
                this.showUpdateNotification(res.data.currentVersion, res.data.latest.version, res.data.latest.notes);
            }
        } catch (error) {
            console.debug('[Update] Check error:', error);
        }
    }

    /**
     * Show update notification UI.
     */
    private showUpdateNotification(currentVersion: string, newVersion: string, notes?: string): void {
        // Remove existing notification
        this.hideNotification();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'wn-update-notification';
        notification.setAttribute('role', 'alertdialog');
        notification.setAttribute('aria-labelledby', 'update-title');
        notification.setAttribute('aria-describedby', 'update-version');

        notification.innerHTML = `
            <div class="wn-update-header">
                <span class="codicon codicon-cloud-download wn-update-icon" aria-hidden="true"></span>
                <span class="wn-update-title" id="update-title">有新版本可用</span>
                <button type="button" class="wn-update-close" aria-label="关闭">
                    <span class="codicon codicon-close" aria-hidden="true"></span>
                </button>
            </div>
            <div class="wn-update-version" id="update-version">
                ${currentVersion} → ${newVersion}
            </div>
            ${notes ? `<div style="font-size: 12px; color: var(--wn-text-secondary); margin-bottom: 12px;">${notes.slice(0, 100)}${notes.length > 100 ? '...' : ''}</div>` : ''}
            <div class="wn-update-progress" style="display: none;">
                <div class="wn-update-progress-bar" style="width: 0%;"></div>
            </div>
            <div class="wn-update-actions">
                <button type="button" class="wn-update-btn wn-update-btn--secondary" data-action="skip">
                    跳过此版本
                </button>
                <button type="button" class="wn-update-btn wn-update-btn--secondary" data-action="later">
                    稍后提醒
                </button>
                <button type="button" class="wn-update-btn wn-update-btn--primary" data-action="download">
                    下载更新
                </button>
            </div>
        `;

        // Event handlers
        const closeBtn = notification.querySelector('.wn-update-close');
        closeBtn?.addEventListener('click', () => this.hideNotification());

        const actionBtns = notification.querySelectorAll('[data-action]');
        actionBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const action = (e.currentTarget as HTMLElement).dataset.action;
                switch (action) {
                    case 'skip':
                        void this.skipVersion(newVersion);
                        break;
                    case 'later':
                        this.hideNotification();
                        break;
                    case 'download':
                        void this.downloadUpdate(newVersion, notification);
                        break;
                }
            });
        });

        document.body.appendChild(notification);
        this.notificationElement = notification;
    }

    /**
     * Hide notification.
     */
    private hideNotification(): void {
        if (this.notificationElement) {
            this.notificationElement.remove();
            this.notificationElement = null;
        }
    }

    /**
     * Skip this version.
     */
    private async skipVersion(version: string): Promise<void> {
        try {
            const res = await this.frontendService.invokeResponse('update:skipVersion', { version });
            if (res.ok) {
                this.messageService.info(`已跳过版本 ${version}`);
                this.hideNotification();
            }
        } catch (error) {
            console.error('[Update] Skip error:', error);
        }
    }

    /**
     * Download update.
     */
    private async downloadUpdate(version: string, notification: HTMLElement): Promise<void> {
        const progressContainer = notification.querySelector('.wn-update-progress') as HTMLElement;
        const progressBar = notification.querySelector('.wn-update-progress-bar') as HTMLElement;
        const downloadBtn = notification.querySelector('[data-action="download"]') as HTMLButtonElement;

        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.textContent = '下载中...';
        }

        try {
            const res = await this.frontendService.invokeResponse('update:download', { version });

            if (!res.ok) {
                this.messageService.error(`下载失败: ${res.error.message}`);
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '重试下载';
                }
                return;
            }

            // Poll for download progress
            const downloadId = res.data.downloadId;
            const pollProgress = async (): Promise<void> => {
                const stateRes = await this.frontendService.invokeResponse('update:getState', {});

                if (stateRes.ok) {
                    const state = stateRes.data;
                    if (state.progress && progressBar) {
                        progressBar.style.width = `${state.progress.percent}%`;
                    }

                    if (state.status === 'downloaded') {
                        if (downloadBtn) {
                            downloadBtn.textContent = '安装并重启';
                            downloadBtn.disabled = false;
                            downloadBtn.dataset.action = 'install';
                            downloadBtn.onclick = () => void this.installUpdate(downloadId);
                        }
                    } else if (state.status === 'downloading') {
                        setTimeout(() => void pollProgress(), 500);
                    } else if (state.status === 'error') {
                        this.messageService.error(`下载失败: ${state.error?.message ?? '未知错误'}`);
                        if (downloadBtn) {
                            downloadBtn.disabled = false;
                            downloadBtn.textContent = '重试下载';
                        }
                    }
                }
            };

            await pollProgress();
        } catch (error) {
            this.messageService.error(`下载失败: ${String(error)}`);
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.textContent = '重试下载';
            }
        }
    }

    /**
     * Install update and restart.
     */
    private async installUpdate(downloadId: string): Promise<void> {
        try {
            const res = await this.frontendService.invokeResponse('update:install', { downloadId });

            if (res.ok && res.data.willRestart) {
                this.messageService.info('正在安装更新，应用将重启...');
            }
        } catch (error) {
            this.messageService.error(`安装失败: ${String(error)}`);
        }
    }
}
