import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_LOG_VIEWER_WIDGET_ID } from '../writenow-layout-ids';
import { WN_STRINGS } from '../i18n/nls';

/**
 * Log entry type.
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

type LogEntry = {
    id: string;
    timestamp: Date;
    level: LogLevel;
    message: string;
    source?: string;
};

/**
 * Check if running in development mode.
 * Why: Only intercept console in development to avoid performance impact in production.
 */
function isDevelopment(): boolean {
    // Check common development indicators
    const hostname = window.location?.hostname ?? '';
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    // Also check if DEBUG env or localStorage flag is set
    const debugFlag = localStorage.getItem('writenow.debug') === 'true';
    return isDev || debugFlag;
}

/**
 * In-memory log store.
 * Why: Collects console logs for the log viewer.
 * Note: Console interception is only enabled in development mode.
 */
class LogStore {
    private static instance: LogStore;
    private logs: LogEntry[] = [];
    private maxLogs = 1000;
    private listeners: Set<() => void> = new Set();
    private intercepting = false;
    private originalConsole: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
        debug: typeof console.debug;
    };

    private constructor() {
        // Save original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            debug: console.debug.bind(console),
        };

        // Only intercept console in development mode
        if (isDevelopment()) {
            this.intercepting = true;
            console.log = (...args) => {
                this.addLog('info', args);
                this.originalConsole.log(...args);
            };
            console.info = (...args) => {
                this.addLog('info', args);
                this.originalConsole.info(...args);
            };
            console.warn = (...args) => {
                this.addLog('warn', args);
                this.originalConsole.warn(...args);
            };
            console.error = (...args) => {
                this.addLog('error', args);
                this.originalConsole.error(...args);
            };
            console.debug = (...args) => {
                this.addLog('debug', args);
                this.originalConsole.debug(...args);
            };
        }
    }

    /**
     * Check if console interception is active.
     */
    isIntercepting(): boolean {
        return this.intercepting;
    }

    static getInstance(): LogStore {
        if (!LogStore.instance) {
            LogStore.instance = new LogStore();
        }
        return LogStore.instance;
    }

    private addLog(level: LogLevel, args: unknown[]): void {
        const message = args
            .map((arg) =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            )
            .join(' ');

        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date(),
            level,
            message,
        };

        this.logs.push(entry);

        // Trim old logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Notify listeners
        this.listeners.forEach((listener) => listener());
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clear(): void {
        this.logs = [];
        this.listeners.forEach((listener) => listener());
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

/**
 * Log viewer view component.
 */
function LogViewerView(props: {
    messageService: MessageService;
}): React.ReactElement {
    const { messageService } = props;

    const [logs, setLogs] = React.useState<LogEntry[]>([]);
    const [filter, setFilter] = React.useState<LogLevel | 'all'>('all');
    const [autoScroll, setAutoScroll] = React.useState(true);
    const logContainerRef = React.useRef<HTMLDivElement>(null);

    // Subscribe to log updates
    React.useEffect(() => {
        const store = LogStore.getInstance();
        setLogs(store.getLogs());

        return store.subscribe(() => {
            setLogs(store.getLogs());
        });
    }, []);

    // Auto-scroll to bottom
    React.useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const filteredLogs = React.useMemo(() => {
        if (filter === 'all') return logs;
        return logs.filter((log) => log.level === filter);
    }, [logs, filter]);

    const store = LogStore.getInstance();
    const isIntercepting = store.isIntercepting();

    const handleExport = (): void => {
        const content = filteredLogs
            .map(
                (log) =>
                    `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
            )
            .join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `writenow-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        messageService.info(WN_STRINGS.logExported());
    };

    const handleClear = (): void => {
        LogStore.getInstance().clear();
        messageService.info(WN_STRINGS.logCleared());
    };

    const formatTimestamp = (date: Date): string => {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="wn-p2-widget wn-log-viewer" role="region" aria-label={WN_STRINGS.logViewer()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.logViewer()}</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={() => setAutoScroll(!autoScroll)}
                        title={autoScroll ? WN_STRINGS.logAutoScrollOn() : WN_STRINGS.logAutoScrollOff()}
                        aria-pressed={autoScroll}
                    >
                        <span className={codicon(autoScroll ? 'pinned' : 'pin')} />
                    </button>
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={handleExport}
                        title={WN_STRINGS.logExport()}
                        aria-label={WN_STRINGS.logExport()}
                    >
                        <span className={codicon('export')} />
                    </button>
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={handleClear}
                        title={WN_STRINGS.logClear()}
                        aria-label={WN_STRINGS.logClear()}
                    >
                        <span className={codicon('clear-all')} />
                    </button>
                </div>
            </header>

            {!isIntercepting && (
                <div style={{ padding: 'var(--wn-space-2) var(--wn-space-4)', background: 'var(--wn-warning-bg)', color: 'var(--wn-warning-text)', fontSize: '12px' }}>
                    生产环境日志收集已禁用。设置 localStorage.setItem('writenow.debug', 'true') 并刷新以启用。
                </div>
            )}

            <div style={{ padding: 'var(--wn-space-3) var(--wn-space-4)', borderBottom: '1px solid var(--wn-border-subtle)' }}>
                <div className="wn-log-filters" role="group" aria-label={WN_STRINGS.logFilter()}>
                    {(['all', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
                        <button
                            key={level}
                            type="button"
                            className={`wn-log-filter-btn ${filter === level ? 'wn-log-filter-btn--active' : ''}`}
                            onClick={() => setFilter(level)}
                            aria-pressed={filter === level}
                        >
                            {level === 'all' ? WN_STRINGS.all() : level.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div
                ref={logContainerRef}
                className="wn-p2-widget-content"
                style={{ fontFamily: 'var(--wn-font-mono)' }}
                role="log"
                aria-live="polite"
            >
                {filteredLogs.length === 0 ? (
                    <div className="wn-empty-state">
                        <span className={codicon('output') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">{WN_STRINGS.logEmpty()}</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div key={log.id} className={`wn-log-entry wn-log-entry--${log.level}`}>
                            <span className="wn-log-timestamp">{formatTimestamp(log.timestamp)}</span>
                            <span className="wn-log-level">{log.level}</span>
                            <span className="wn-log-message">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

@injectable()
export class LogViewerWidget extends ReactWidget {
    static readonly ID = WRITENOW_LOG_VIEWER_WIDGET_ID;

    constructor(
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = LogViewerWidget.ID;
        this.title.label = WN_STRINGS.logViewer();
        this.title.caption = WN_STRINGS.logViewerCaption();
        this.title.iconClass = codicon('output');
        this.title.closable = true;
        this.addClass('writenow-log-viewer');

        this.update();
    }

    protected override render(): React.ReactNode {
        return <LogViewerView messageService={this.messageService} />;
    }
}
