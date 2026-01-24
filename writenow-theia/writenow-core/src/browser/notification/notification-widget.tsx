import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { injectable } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';

import { WRITENOW_NOTIFICATION_WIDGET_ID } from '../writenow-layout-ids';

/**
 * Notification type.
 */
type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification item.
 */
export type NotificationItem = {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
};

/**
 * NotificationService - Manages application notifications.
 *
 * Why: Centralized notification management for the application.
 */
@injectable()
export class NotificationService {
    private readonly notifications: NotificationItem[] = [];
    private readonly onDidChangeEmitter = new Emitter<void>();
    readonly onDidChange: Event<void> = this.onDidChangeEmitter.event;

    private idCounter = 0;

    /**
     * Add a new notification.
     */
    add(type: NotificationType, title: string, message: string): void {
        const notification: NotificationItem = {
            id: `notification-${++this.idCounter}`,
            type,
            title,
            message,
            timestamp: new Date(),
            read: false,
        };
        this.notifications.unshift(notification);
        this.onDidChangeEmitter.fire();
    }

    /**
     * Get all notifications.
     */
    getAll(): readonly NotificationItem[] {
        return this.notifications;
    }

    /**
     * Get unread count.
     */
    getUnreadCount(): number {
        return this.notifications.filter((n) => !n.read).length;
    }

    /**
     * Mark a notification as read.
     */
    markRead(id: string): void {
        const notification = this.notifications.find((n) => n.id === id);
        if (notification) {
            notification.read = true;
            this.onDidChangeEmitter.fire();
        }
    }

    /**
     * Mark all as read.
     */
    markAllRead(): void {
        for (const notification of this.notifications) {
            notification.read = true;
        }
        this.onDidChangeEmitter.fire();
    }

    /**
     * Clear all notifications.
     */
    clear(): void {
        this.notifications.length = 0;
        this.onDidChangeEmitter.fire();
    }

    /**
     * Remove a notification.
     */
    remove(id: string): void {
        const index = this.notifications.findIndex((n) => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.onDidChangeEmitter.fire();
        }
    }
}

/**
 * Get icon for notification type.
 */
function getNotificationIcon(type: NotificationType): string {
    switch (type) {
        case 'success':
            return 'pass-filled';
        case 'warning':
            return 'warning';
        case 'error':
            return 'error';
        default:
            return 'info';
    }
}

/**
 * Format relative time.
 */
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    return `${diffDays} 天前`;
}

type NotificationViewProps = Readonly<{
    service: NotificationService;
    onClose: () => void;
}>;

/**
 * Notification list view component.
 */
function NotificationView(props: NotificationViewProps): React.ReactElement {
    const { service, onClose } = props;
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    // Listen to service changes
    React.useEffect(() => {
        const disposable = service.onDidChange(() => forceUpdate());
        return () => disposable.dispose();
    }, [service]);

    const notifications = service.getAll();

    return (
        <div className="wn-notification-container" data-testid="writenow-notification-center">
            <header className="wn-notification-header">
                <h2 className="wn-notification-title">
                    <span className={codicon('bell')} />
                    通知中心
                </h2>
                <div className="wn-notification-actions">
                    <button
                        type="button"
                        className="wn-notification-action"
                        onClick={() => service.markAllRead()}
                        title="全部已读"
                    >
                        <span className={codicon('check-all')} />
                    </button>
                    <button
                        type="button"
                        className="wn-notification-action"
                        onClick={() => service.clear()}
                        title="清空"
                    >
                        <span className={codicon('clear-all')} />
                    </button>
                    <button
                        type="button"
                        className="wn-notification-close"
                        onClick={onClose}
                        title="关闭"
                    >
                        <span className={codicon('close')} />
                    </button>
                </div>
            </header>

            <div className="wn-notification-content">
                {notifications.length === 0 ? (
                    <div className="wn-notification-empty">
                        <span className={codicon('bell-slash')} />
                        <p>暂无通知</p>
                    </div>
                ) : (
                    <div className="wn-notification-list">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`wn-notification-item wn-notification-item--${notification.type} ${!notification.read ? 'wn-notification-item--unread' : ''}`}
                                onClick={() => service.markRead(notification.id)}
                            >
                                <span className={`wn-notification-icon ${codicon(getNotificationIcon(notification.type))}`} />
                                <div className="wn-notification-body">
                                    <div className="wn-notification-item-title">{notification.title}</div>
                                    <div className="wn-notification-message">{notification.message}</div>
                                    <div className="wn-notification-time">{formatRelativeTime(notification.timestamp)}</div>
                                </div>
                                <button
                                    type="button"
                                    className="wn-notification-dismiss"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        service.remove(notification.id);
                                    }}
                                    title="删除"
                                >
                                    <span className={codicon('close')} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * NotificationWidget - Notification center panel.
 *
 * Why: Provides a centralized view for all application notifications.
 */
@injectable()
export class NotificationWidget extends ReactWidget {
    static readonly ID = WRITENOW_NOTIFICATION_WIDGET_ID;

    private service: NotificationService;

    constructor() {
        super();
        this.id = NotificationWidget.ID;
        this.title.label = '通知';
        this.title.caption = '通知中心';
        this.title.iconClass = codicon('bell');
        this.title.closable = true;
        this.addClass('writenow-notification');

        // Create a default service instance
        this.service = new NotificationService();

        this.update();
    }

    /**
     * Set the notification service.
     */
    setService(service: NotificationService): void {
        this.service = service;
        this.update();
    }

    /**
     * Get the notification service.
     */
    getService(): NotificationService {
        return this.service;
    }

    protected override render(): React.ReactNode {
        return (
            <NotificationView
                service={this.service}
                onClose={() => this.close()}
            />
        );
    }
}
