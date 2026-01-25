import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_LOG_VIEWER_WIDGET_ID } from '../writenow-layout-ids';

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
 * In-memory log store.
 * Why: Collects console logs for the log viewer.
 */
class LogStore {
    private static instance: LogStore;
    private logs: LogEntry[] = [];
    private maxLogs = 1000;
    private listeners: Set<() => void> = new Set();
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

        // Intercept console methods
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

        messageService.info('日志已导出');
    };

    const handleClear = (): void => {
        LogStore.getInstance().clear();
        messageService.info('日志已清空');
    };

    const formatTimestamp = (date: Date): string => {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="wn-p2-widget wn-log-viewer" role="region" aria-label="日志查看器">
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">日志查看器</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={() => setAutoScroll(!autoScroll)}
                        title={autoScroll ? '关闭自动滚动' : '开启自动滚动'}
                        aria-pressed={autoScroll}
                    >
                        <span className={codicon(autoScroll ? 'pinned' : 'pin')} />
                    </button>
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={handleExport}
                        title="导出日志"
                        aria-label="导出日志"
                    >
                        <span className={codicon('export')} />
                    </button>
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={handleClear}
                        title="清空日志"
                        aria-label="清空日志"
                    >
                        <span className={codicon('clear-all')} />
                    </button>
                </div>
            </header>

            <div style={{ padding: 'var(--wn-space-3) var(--wn-space-4)', borderBottom: '1px solid var(--wn-border-subtle)' }}>
                <div className="wn-log-filters" role="group" aria-label="日志级别过滤">
                    {(['all', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
                        <button
                            key={level}
                            type="button"
                            className={`wn-log-filter-btn ${filter === level ? 'wn-log-filter-btn--active' : ''}`}
                            onClick={() => setFilter(level)}
                            aria-pressed={filter === level}
                        >
                            {level === 'all' ? '全部' : level.toUpperCase()}
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
                        <p className="wn-empty-state-title">暂无日志</p>
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
        this.title.label = '日志查看器';
        this.title.caption = '查看应用日志';
        this.title.iconClass = codicon('output');
        this.title.closable = true;
        this.addClass('writenow-log-viewer');

        this.update();
    }

    protected override render(): React.ReactNode {
        return <LogViewerView messageService={this.messageService} />;
    }
}
