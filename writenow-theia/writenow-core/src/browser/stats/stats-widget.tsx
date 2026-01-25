import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_STATS_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WN_STRINGS } from '../i18n/nls';
import type { WritingStatsRow } from '../../common/ipc-generated';

/**
 * Format minutes to hours and minutes using i18n.
 */
function formatMinutes(minutes: number): string {
    if (minutes < 60) {
        return WN_STRINGS.statsMinutes(minutes);
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? WN_STRINGS.statsHoursMinutes(hours, mins) : WN_STRINGS.statsHours(hours);
}

/**
 * Stats view component.
 */
function StatsView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [todayStats, setTodayStats] = React.useState<WritingStatsRow | null>(null);
    const [rangeStats, setRangeStats] = React.useState<WritingStatsRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [range, setRange] = React.useState<'week' | 'month'>('week');

    // Load stats
    React.useEffect(() => {
        const load = async (): Promise<void> => {
            setLoading(true);
            try {
                // Get today's stats
                const todayRes = await frontendService.invokeResponse('stats:getToday', {});
                if (todayRes.ok) {
                    setTodayStats(todayRes.data.stats);
                }

                // Get range stats
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(
                    Date.now() - (range === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .split('T')[0];

                const rangeRes = await frontendService.invokeResponse('stats:getRange', { startDate, endDate });
                if (rangeRes.ok) {
                    setRangeStats(rangeRes.data.items);
                }
            } catch (error) {
                messageService.error(WN_STRINGS.statsLoadFailed(String(error)));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [frontendService, messageService, range]);

    // Calculate totals
    const totals = React.useMemo(() => {
        return rangeStats.reduce(
            (acc, day) => ({
                wordCount: acc.wordCount + day.wordCount,
                writingMinutes: acc.writingMinutes + day.writingMinutes,
                articlesCreated: acc.articlesCreated + day.articlesCreated,
                skillsUsed: acc.skillsUsed + day.skillsUsed,
            }),
            { wordCount: 0, writingMinutes: 0, articlesCreated: 0, skillsUsed: 0 }
        );
    }, [rangeStats]);

    // Simple bar chart data
    const chartData = React.useMemo(() => {
        const maxWordCount = Math.max(...rangeStats.map((s) => s.wordCount), 1);
        return rangeStats.map((s) => ({
            date: s.date.slice(5), // MM-DD
            wordCount: s.wordCount,
            height: (s.wordCount / maxWordCount) * 100,
        }));
    }, [rangeStats]);

    if (loading) {
        return (
            <div className="wn-p2-widget wn-stats-widget" role="region" aria-label={WN_STRINGS.statsPanel()}>
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>{WN_STRINGS.loading()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-stats-widget" role="region" aria-label={WN_STRINGS.statsPanel()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.statsPanel()}</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className={`wn-log-filter-btn ${range === 'week' ? 'wn-log-filter-btn--active' : ''}`}
                        onClick={() => setRange('week')}
                        aria-pressed={range === 'week'}
                    >
                        {WN_STRINGS.statsLast7Days()}
                    </button>
                    <button
                        type="button"
                        className={`wn-log-filter-btn ${range === 'month' ? 'wn-log-filter-btn--active' : ''}`}
                        onClick={() => setRange('month')}
                        aria-pressed={range === 'month'}
                    >
                        {WN_STRINGS.statsLast30Days()}
                    </button>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {/* Today's Stats */}
                <div className="wn-stats-card">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{WN_STRINGS.statsToday()}</h3>
                    <div className="wn-stats-grid">
                        <div className="wn-stats-item">
                            <div className="wn-stats-value">{todayStats?.wordCount ?? 0}</div>
                            <div className="wn-stats-label">{WN_STRINGS.statsWordCount()}</div>
                        </div>
                        <div className="wn-stats-item">
                            <div className="wn-stats-value">
                                {formatMinutes(todayStats?.writingMinutes ?? 0)}
                            </div>
                            <div className="wn-stats-label">{WN_STRINGS.statsWritingDuration()}</div>
                        </div>
                        <div className="wn-stats-item">
                            <div className="wn-stats-value">{todayStats?.articlesCreated ?? 0}</div>
                            <div className="wn-stats-label">{WN_STRINGS.statsNewDocs()}</div>
                        </div>
                        <div className="wn-stats-item">
                            <div className="wn-stats-value">{todayStats?.skillsUsed ?? 0}</div>
                            <div className="wn-stats-label">{WN_STRINGS.statsAiSkills()}</div>
                        </div>
                    </div>
                </div>

                {/* Range Stats Summary */}
                <div className="wn-stats-card">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                        {WN_STRINGS.statsSummary(range === 'week' ? WN_STRINGS.statsLast7Days() : WN_STRINGS.statsLast30Days())}
                    </h3>
                    <div className="wn-stats-grid">
                        <div className="wn-stats-item">
                            <div className="wn-stats-value">{totals.wordCount.toLocaleString()}</div>
                            <div className="wn-stats-label">{WN_STRINGS.statsTotalWords()}</div>
                        </div>
                        <div className="wn-stats-item">
                            <div className="wn-stats-value">
                                {formatMinutes(totals.writingMinutes)}
                            </div>
                            <div className="wn-stats-label">{WN_STRINGS.statsTotalDuration()}</div>
                        </div>
                    </div>
                </div>

                {/* Simple Bar Chart */}
                <div className="wn-stats-card">
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{WN_STRINGS.statsTrend()}</h3>
                    {chartData.length === 0 ? (
                        <div className="wn-empty-state" style={{ padding: '24px' }}>
                            <p>{WN_STRINGS.noData()}</p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                height: '120px',
                                gap: '4px',
                                padding: '8px 0',
                            }}
                            role="img"
                            aria-label={WN_STRINGS.statsTrendAria()}
                        >
                            {chartData.map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        minWidth: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            maxWidth: '24px',
                                            height: `${Math.max(item.height, 2)}%`,
                                            background: 'var(--wn-accent-primary)',
                                            borderRadius: '2px 2px 0 0',
                                            transition: 'height 0.3s',
                                        }}
                                        title={WN_STRINGS.statsBarTitle(item.date, item.wordCount)}
                                    />
                                    <span
                                        style={{
                                            fontSize: '10px',
                                            color: 'var(--wn-text-tertiary)',
                                            marginTop: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            width: '100%',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {item.date}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

@injectable()
export class StatsWidget extends ReactWidget {
    static readonly ID = WRITENOW_STATS_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = StatsWidget.ID;
        this.title.label = WN_STRINGS.statsPanel();
        this.title.caption = WN_STRINGS.statsPanelCaption();
        this.title.iconClass = codicon('graph');
        this.title.closable = true;
        this.addClass('writenow-stats');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <StatsView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
