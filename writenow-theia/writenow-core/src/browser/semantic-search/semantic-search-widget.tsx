import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_SEMANTIC_SEARCH_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WN_STRINGS } from '../i18n/nls';
import type { SearchSemanticHit } from '../../common/ipc-generated';

/**
 * Semantic search view component.
 *
 * Why: Exposes the embedding/RAG search capability through a user-friendly interface.
 * Calls search:semantic IPC to find relevant document fragments by meaning.
 */
function SemanticSearchView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<SearchSemanticHit[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [hasSearched, setHasSearched] = React.useState(false);

    const handleSearch = async (): Promise<void> => {
        if (!query.trim()) {
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await frontendService.invokeResponse('search:semantic', {
                query: query.trim(),
                limit: 20,
            });
            if (res.ok) {
                setResults(res.data.items);
            } else {
                messageService.error(WN_STRINGS.semanticSearchLoadFailed(res.error.message));
            }
        } catch (error) {
            messageService.error(WN_STRINGS.semanticSearchLoadFailed(String(error)));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter') {
            void handleSearch();
        }
    };

    return (
        <div className="wn-p2-widget wn-semantic-search-widget" role="region" aria-label={WN_STRINGS.semanticSearchPanel()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.semanticSearchPanel()}</h2>
            </header>

            <div className="wn-p2-widget-content">
                {/* Search input */}
                <div className="wn-semantic-search-form" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        className="wn-settings-input"
                        style={{ flex: 1 }}
                        placeholder={WN_STRINGS.semanticSearchPlaceholder()}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label={WN_STRINGS.semanticSearchPlaceholder()}
                    />
                    <button
                        type="button"
                        className="wn-settings-button wn-settings-button--primary"
                        onClick={() => void handleSearch()}
                        disabled={loading || !query.trim()}
                    >
                        {loading ? (
                            <span className={codicon('loading') + ' codicon-modifier-spin'} />
                        ) : (
                            <span className={codicon('search')} />
                        )}
                        {' '}{WN_STRINGS.semanticSearchButton()}
                    </button>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="wn-empty-state">
                        <span className={codicon('loading') + ' codicon-modifier-spin'} />
                        <p>{WN_STRINGS.loading()}</p>
                    </div>
                ) : hasSearched && results.length === 0 ? (
                    <div className="wn-empty-state">
                        <span className={codicon('search') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">{WN_STRINGS.semanticSearchEmpty()}</p>
                        <p className="wn-empty-state-description">{WN_STRINGS.semanticSearchEmptyHint()}</p>
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <div style={{ marginBottom: '12px', color: 'var(--wn-text-secondary)', fontSize: '13px' }}>
                            {WN_STRINGS.semanticSearchResults(results.length)}
                        </div>
                        <div role="list" className="wn-semantic-search-results">
                            {results.map((hit) => (
                                <div
                                    key={hit.id}
                                    className="wn-semantic-search-item"
                                    role="listitem"
                                    style={{
                                        padding: '12px',
                                        marginBottom: '8px',
                                        background: 'var(--wn-bg-secondary)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 500, color: 'var(--wn-text-primary)' }}>
                                            {hit.title || hit.id}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '12px',
                                                color: 'var(--wn-accent-primary)',
                                                background: 'var(--wn-accent-primary-muted)',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                            }}
                                        >
                                            {WN_STRINGS.semanticSearchScore(Math.round(hit.score * 100))}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '13px',
                                            color: 'var(--wn-text-secondary)',
                                            lineHeight: '1.5',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    >
                                        {hit.snippet}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}

@injectable()
export class SemanticSearchWidget extends ReactWidget {
    static readonly ID = WRITENOW_SEMANTIC_SEARCH_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = SemanticSearchWidget.ID;
        this.title.label = WN_STRINGS.semanticSearchPanel();
        this.title.caption = WN_STRINGS.semanticSearchCaption();
        this.title.iconClass = codicon('search');
        this.title.closable = true;
        this.addClass('writenow-semantic-search');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <SemanticSearchView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
