import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CONTEXT_DEBUGGER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WN_STRINGS } from '../i18n/nls';
import type {
    ContextWritenowRulesGetResponse,
    ContextWritenowSettingsListResponse,
    MemoryInjectionPreviewResponse,
} from '../../common/ipc-generated';

/**
 * Context layer type for display.
 */
type ContextLayer = {
    id: string;
    name: string;
    icon: string;
    source: string;
    content: string;
    tokenEstimate: number;
    expanded: boolean;
};

/**
 * Token budget info.
 */
type TokenBudget = {
    used: number;
    total: number;
    layers: { name: string; tokens: number }[];
};

/**
 * Estimate token count from text (rough: ~4 chars per token for Chinese).
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 2);
}

/**
 * Context debugger view component.
 *
 * Why: Provides visibility into AI context assembly for debugging and optimization.
 * Displays context layers (System/Project/Document/Selection) and token budget usage.
 */
function ContextDebuggerView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [layers, setLayers] = React.useState<ContextLayer[]>([]);
    const [budget, setBudget] = React.useState<TokenBudget>({ used: 0, total: 8000, layers: [] });
    const [loading, setLoading] = React.useState(true);
    const [projectId, setProjectId] = React.useState<string | null>(null);

    // Load context debug info
    const loadContextInfo = React.useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            // Get current project
            const projectRes = await frontendService.invokeResponse('project:getCurrent', {});
            const currentProjectId = projectRes.ok ? projectRes.data.projectId : null;
            setProjectId(currentProjectId);

            if (!currentProjectId) {
                setLayers([]);
                setBudget({ used: 0, total: 8000, layers: [] });
                setLoading(false);
                return;
            }

            const newLayers: ContextLayer[] = [];
            const budgetLayers: { name: string; tokens: number }[] = [];

            // 1. System layer - Rules
            try {
                const rulesRes = await frontendService.invokeResponse('context:writenow:rules:get', {
                    projectId: currentProjectId,
                });
                if (rulesRes.ok) {
                    const rulesData = rulesRes.data as ContextWritenowRulesGetResponse;
                    const rulesContent = rulesData.fragments.map((f) => `[${f.kind}] ${f.path}`).join('\n');
                    const tokens = rulesData.fragments.reduce((sum, f) => sum + estimateTokens(f.content), 0);
                    newLayers.push({
                        id: 'system',
                        name: WN_STRINGS.contextDebuggerLayerSystem(),
                        icon: codicon('gear'),
                        source: `${rulesData.fragments.length} 条规则`,
                        content: rulesContent || '无规则加载',
                        tokenEstimate: tokens,
                        expanded: false,
                    });
                    budgetLayers.push({ name: WN_STRINGS.contextDebuggerLayerSystem(), tokens });
                }
            } catch {
                // Ignore errors for optional layers
            }

            // 2. Project layer - Settings (characters/settings)
            try {
                const settingsRes = await frontendService.invokeResponse('context:writenow:settings:list', {
                    projectId: currentProjectId,
                });
                if (settingsRes.ok) {
                    const settingsData = settingsRes.data as ContextWritenowSettingsListResponse;
                    const charCount = settingsData.characters?.length || 0;
                    const settingCount = settingsData.settings?.length || 0;
                    const content = [
                        charCount > 0 ? `角色: ${settingsData.characters?.join(', ')}` : '',
                        settingCount > 0 ? `设定: ${settingsData.settings?.join(', ')}` : '',
                    ].filter(Boolean).join('\n');
                    const tokens = estimateTokens(content) * 10; // Assume full content is 10x summary
                    newLayers.push({
                        id: 'project',
                        name: WN_STRINGS.contextDebuggerLayerProject(),
                        icon: codicon('folder'),
                        source: `${charCount} 角色, ${settingCount} 设定`,
                        content: content || '无项目设定',
                        tokenEstimate: tokens,
                        expanded: false,
                    });
                    budgetLayers.push({ name: WN_STRINGS.contextDebuggerLayerProject(), tokens });
                }
            } catch {
                // Ignore errors for optional layers
            }

            // 3. Memory injection preview
            try {
                const memoryRes = await frontendService.invokeResponse('memory:injection:preview', {
                    projectId: currentProjectId,
                });
                if (memoryRes.ok) {
                    const memoryData = memoryRes.data as MemoryInjectionPreviewResponse;
                    const memCount = memoryData.injected?.memory?.length || 0;
                    const content = memoryData.injected?.memory?.map((m) => `[${m.type}] ${m.content}`).join('\n') || '';
                    const tokens = estimateTokens(content);
                    if (memCount > 0) {
                        newLayers.push({
                            id: 'memory',
                            name: '记忆注入',
                            icon: codicon('lightbulb'),
                            source: `${memCount} 条记忆`,
                            content: content || '无记忆注入',
                            tokenEstimate: tokens,
                            expanded: false,
                        });
                        budgetLayers.push({ name: '记忆注入', tokens });
                    }
                }
            } catch {
                // Ignore errors for optional layers
            }

            // 4. Document layer - placeholder (would need active editor context)
            newLayers.push({
                id: 'document',
                name: WN_STRINGS.contextDebuggerLayerDocument(),
                icon: codicon('file-text'),
                source: '当前文档',
                content: '文档上下文将在编辑器激活时加载',
                tokenEstimate: 0,
                expanded: false,
            });
            budgetLayers.push({ name: WN_STRINGS.contextDebuggerLayerDocument(), tokens: 0 });

            // 5. Selection layer - placeholder
            newLayers.push({
                id: 'selection',
                name: WN_STRINGS.contextDebuggerLayerSelection(),
                icon: codicon('selection'),
                source: '当前选区',
                content: '选区上下文将在有选中内容时加载',
                tokenEstimate: 0,
                expanded: false,
            });
            budgetLayers.push({ name: WN_STRINGS.contextDebuggerLayerSelection(), tokens: 0 });

            setLayers(newLayers);
            const totalUsed = budgetLayers.reduce((sum, l) => sum + l.tokens, 0);
            setBudget({ used: totalUsed, total: 8000, layers: budgetLayers });
        } catch (error) {
            messageService.error(WN_STRINGS.contextDebuggerLoadFailed(String(error)));
        } finally {
            setLoading(false);
        }
    }, [frontendService, messageService]);

    React.useEffect(() => {
        void loadContextInfo();
    }, [loadContextInfo]);

    const toggleLayer = (id: string): void => {
        setLayers((prev) =>
            prev.map((layer) =>
                layer.id === id ? { ...layer, expanded: !layer.expanded } : layer
            )
        );
    };

    const budgetPercent = Math.min(100, (budget.used / budget.total) * 100);
    const budgetColor = budgetPercent > 80 ? 'var(--wn-feedback-error)' : budgetPercent > 60 ? 'var(--wn-feedback-warning)' : 'var(--wn-accent-primary)';

    if (loading) {
        return (
            <div className="wn-p2-widget wn-context-debugger-widget" role="region" aria-label={WN_STRINGS.contextDebuggerPanel()}>
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>{WN_STRINGS.loading()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-context-debugger-widget" role="region" aria-label={WN_STRINGS.contextDebuggerPanel()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.contextDebuggerPanel()}</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={() => void loadContextInfo()}
                        aria-label={WN_STRINGS.contextDebuggerRefresh()}
                        title={WN_STRINGS.contextDebuggerRefresh()}
                    >
                        <span className={codicon('refresh')} />
                    </button>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {!projectId ? (
                    <div className="wn-empty-state">
                        <span className={codicon('info') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">{WN_STRINGS.contextDebuggerEmpty()}</p>
                        <p className="wn-empty-state-description">请先打开一个项目</p>
                    </div>
                ) : (
                    <>
                        {/* Token Budget Card */}
                        <div className="wn-stats-card" style={{ marginBottom: '16px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>{WN_STRINGS.contextDebuggerTokenBudget()}</h3>
                            <div style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                                    <span>{WN_STRINGS.contextDebuggerTokenUsed()}: {budget.used.toLocaleString()}</span>
                                    <span>{WN_STRINGS.contextDebuggerTokenTotal()}: {budget.total.toLocaleString()}</span>
                                </div>
                                <div
                                    style={{
                                        height: '8px',
                                        background: 'var(--wn-bg-tertiary)',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${budgetPercent}%`,
                                            background: budgetColor,
                                            transition: 'width 0.3s, background 0.3s',
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                {budget.layers.filter((l) => l.tokens > 0).map((layer) => (
                                    <span
                                        key={layer.name}
                                        style={{
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            background: 'var(--wn-bg-tertiary)',
                                            borderRadius: '10px',
                                            color: 'var(--wn-text-secondary)',
                                        }}
                                    >
                                        {layer.name}: {layer.tokens}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Context Layers */}
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>上下文层级</h3>
                        <div role="list">
                            {layers.map((layer) => (
                                <div
                                    key={layer.id}
                                    className="wn-context-layer"
                                    role="listitem"
                                    style={{
                                        marginBottom: '8px',
                                        background: 'var(--wn-bg-secondary)',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleLayer(layer.id)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--wn-text-primary)',
                                            textAlign: 'left',
                                        }}
                                        aria-expanded={layer.expanded}
                                    >
                                        <span className={codicon(layer.expanded ? 'chevron-down' : 'chevron-right')} />
                                        <span className={layer.icon} />
                                        <span style={{ flex: 1, fontWeight: 500 }}>{layer.name}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--wn-text-tertiary)' }}>
                                            {layer.source}
                                        </span>
                                        {layer.tokenEstimate > 0 && (
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    background: 'var(--wn-accent-primary-muted)',
                                                    color: 'var(--wn-accent-primary)',
                                                    borderRadius: '10px',
                                                }}
                                            >
                                                ~{layer.tokenEstimate} tokens
                                            </span>
                                        )}
                                    </button>
                                    {layer.expanded && (
                                        <div
                                            style={{
                                                padding: '0 12px 12px 40px',
                                                fontSize: '13px',
                                                color: 'var(--wn-text-secondary)',
                                                whiteSpace: 'pre-wrap',
                                                maxHeight: '200px',
                                                overflow: 'auto',
                                            }}
                                        >
                                            {layer.content}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

@injectable()
export class ContextDebuggerWidget extends ReactWidget {
    static readonly ID = WRITENOW_CONTEXT_DEBUGGER_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = ContextDebuggerWidget.ID;
        this.title.label = WN_STRINGS.contextDebuggerPanel();
        this.title.caption = WN_STRINGS.contextDebuggerCaption();
        this.title.iconClass = codicon('debug');
        this.title.closable = true;
        this.addClass('writenow-context-debugger');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <ContextDebuggerView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
