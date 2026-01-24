import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { inject, injectable } from '@theia/core/shared/inversify';

import { NotificationWidget, NotificationService } from './notification-widget';

const STATUSBAR_NOTIFICATION_ID = 'writenow.statusbar.notification';

/**
 * Why: NotificationWidgetFactory creates the NotificationWidget instance for Theia's widget system.
 */
@injectable()
export class NotificationWidgetFactory implements WidgetFactory {
    static readonly ID = NotificationWidget.ID;
    readonly id = NotificationWidgetFactory.ID;

    constructor(
        @inject(NotificationService) private readonly service: NotificationService,
    ) {}

    async createWidget(): Promise<NotificationWidget> {
        const widget = new NotificationWidget();
        widget.setService(this.service);
        return widget;
    }
}

/**
 * Why: NotificationContribution manages the notification status bar item and panel.
 */
@injectable()
export class NotificationContribution implements FrontendApplicationContribution, Disposable {
    private readonly disposables = new DisposableCollection();

    constructor(
        @inject(StatusBar) private readonly statusBar: StatusBar,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
        @inject(NotificationService) private readonly service: NotificationService,
    ) {}

    async onStart(): Promise<void> {
        // Register status bar item
        this.updateStatusBarItem();

        // Listen to notification changes
        this.disposables.push(
            this.service.onDidChange(() => {
                this.updateStatusBarItem();
            })
        );

        // Set up click handler
        this.statusBar.setElement(STATUSBAR_NOTIFICATION_ID, {
            text: this.getStatusText(),
            alignment: StatusBarAlignment.RIGHT,
            priority: 98,
            tooltip: '通知中心',
            command: 'writenow.notification.toggle',
        });
    }

    dispose(): void {
        this.disposables.dispose();
        this.statusBar.removeElement(STATUSBAR_NOTIFICATION_ID);
    }

    private updateStatusBarItem(): void {
        const unreadCount = this.service.getUnreadCount();
        this.statusBar.setElement(STATUSBAR_NOTIFICATION_ID, {
            text: this.getStatusText(),
            alignment: StatusBarAlignment.RIGHT,
            priority: 98,
            tooltip: unreadCount > 0 ? `${unreadCount} 条未读通知` : '通知中心',
            command: 'writenow.notification.toggle',
            className: unreadCount > 0 ? 'wn-statusbar-notification--unread' : '',
        });
    }

    private getStatusText(): string {
        const unreadCount = this.service.getUnreadCount();
        if (unreadCount > 0) {
            return `$(bell-dot) ${unreadCount}`;
        }
        return '$(bell)';
    }

    async toggleNotificationPanel(): Promise<void> {
        const widget = await this.widgetManager.getOrCreateWidget(NotificationWidget.ID);
        if (widget.isVisible) {
            widget.close();
        } else {
            if (!widget.isAttached) {
                widget.show();
            }
            widget.activate();
        }
    }
}
