import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_CONSTRAINT_EDITOR_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WN_STRINGS } from '../i18n/nls';
import type { ConstraintRule, ConstraintType, ConstraintLevel, ConstraintsConfig } from '../../common/ipc-generated';

/**
 * Get display label for constraint type.
 */
function getConstraintTypeLabel(type: ConstraintType): string {
    switch (type) {
        case 'forbidden_words':
            return WN_STRINGS.constraintTypeForbiddenWords();
        case 'word_count':
            return WN_STRINGS.constraintTypeWordCount();
        case 'format':
            return WN_STRINGS.constraintTypeFormat();
        case 'terminology':
            return WN_STRINGS.constraintTypeTerminology();
        case 'tone':
            return WN_STRINGS.constraintTypeTone();
        case 'coverage':
            return WN_STRINGS.constraintTypeCoverage();
        default:
            return type;
    }
}

/**
 * Get display label for constraint level.
 */
function getConstraintLevelLabel(level: ConstraintLevel): string {
    switch (level) {
        case 'error':
            return WN_STRINGS.constraintLevelError();
        case 'warning':
            return WN_STRINGS.constraintLevelWarning();
        case 'info':
            return WN_STRINGS.constraintLevelInfo();
        default:
            return level;
    }
}

/**
 * Get icon for constraint level.
 */
function getConstraintLevelIcon(level: ConstraintLevel): string {
    switch (level) {
        case 'error':
            return codicon('error');
        case 'warning':
            return codicon('warning');
        case 'info':
            return codicon('info');
        default:
            return codicon('circle');
    }
}

/**
 * Get color for constraint level.
 */
function getConstraintLevelColor(level: ConstraintLevel): string {
    switch (level) {
        case 'error':
            return 'var(--wn-feedback-error)';
        case 'warning':
            return 'var(--wn-feedback-warning)';
        case 'info':
            return 'var(--wn-feedback-info)';
        default:
            return 'var(--wn-text-secondary)';
    }
}

/**
 * Constraint editor view component.
 *
 * Why: Manages AI writing constraints through constraints:get/set IPC.
 * Allows users to create, edit, enable/disable, and delete constraint rules.
 */
function ConstraintEditorView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [config, setConfig] = React.useState<ConstraintsConfig | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isEditing, setIsEditing] = React.useState(false);
    const [formState, setFormState] = React.useState<{
        type: ConstraintType;
        level: ConstraintLevel;
        configValue: string;
    }>({
        type: 'forbidden_words',
        level: 'warning',
        configValue: '',
    });

    // Load constraints
    React.useEffect(() => {
        const load = async (): Promise<void> => {
            setLoading(true);
            try {
                const res = await frontendService.invokeResponse('constraints:get', {});
                if (res.ok) {
                    setConfig(res.data.config);
                } else {
                    messageService.error(WN_STRINGS.constraintLoadFailed(res.error.message));
                }
            } catch (error) {
                messageService.error(WN_STRINGS.constraintLoadFailed(String(error)));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [frontendService, messageService]);

    const saveConfig = async (newConfig: ConstraintsConfig): Promise<boolean> => {
        try {
            const res = await frontendService.invokeResponse('constraints:set', { config: newConfig });
            if (res.ok) {
                setConfig(res.data.config);
                messageService.info(WN_STRINGS.constraintSaveSuccess());
                return true;
            } else {
                messageService.error(WN_STRINGS.constraintSaveFailed(res.error.message));
                return false;
            }
        } catch (error) {
            messageService.error(WN_STRINGS.constraintSaveFailed(String(error)));
            return false;
        }
    };

    const handleCreate = async (): Promise<void> => {
        if (!config || !formState.configValue.trim()) {
            return;
        }

        const newRule: ConstraintRule = {
            id: `constraint-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: formState.type,
            enabled: true,
            config: parseConfigValue(formState.type, formState.configValue),
            level: formState.level,
            scope: 'global',
        };

        const newConfig: ConstraintsConfig = {
            ...config,
            global: {
                ...config.global,
                rules: [...config.global.rules, newRule],
            },
        };

        const success = await saveConfig(newConfig);
        if (success) {
            setFormState({ type: 'forbidden_words', level: 'warning', configValue: '' });
            setIsEditing(false);
        }
    };

    const handleToggle = async (ruleId: string, enabled: boolean): Promise<void> => {
        if (!config) return;

        const newConfig: ConstraintsConfig = {
            ...config,
            global: {
                ...config.global,
                rules: config.global.rules.map((r) =>
                    r.id === ruleId ? { ...r, enabled } : r
                ),
            },
        };

        await saveConfig(newConfig);
    };

    const handleDelete = async (ruleId: string): Promise<void> => {
        if (!config) return;

        const newConfig: ConstraintsConfig = {
            ...config,
            global: {
                ...config.global,
                rules: config.global.rules.filter((r) => r.id !== ruleId),
            },
        };

        const success = await saveConfig(newConfig);
        if (success) {
            messageService.info(WN_STRINGS.constraintDeleteSuccess());
        }
    };

    const handleCancel = (): void => {
        setFormState({ type: 'forbidden_words', level: 'warning', configValue: '' });
        setIsEditing(false);
    };

    // Parse config value based on type
    function parseConfigValue(type: ConstraintType, value: string): Record<string, unknown> {
        switch (type) {
            case 'forbidden_words':
                return { words: value.split(',').map((w) => w.trim()).filter(Boolean) };
            case 'word_count':
                return { min: 0, max: parseInt(value, 10) || 1000 };
            case 'format':
                return { pattern: value };
            case 'tone':
                return { style: value };
            case 'coverage':
                return { topics: value.split(',').map((t) => t.trim()).filter(Boolean) };
            default:
                return { value };
        }
    }

    // Format config for display
    function formatConfigForDisplay(rule: ConstraintRule): string {
        const cfg = rule.config as Record<string, unknown>;
        switch (rule.type) {
            case 'forbidden_words':
                return (cfg.words as string[])?.join(', ') || '';
            case 'word_count':
                return `${cfg.min || 0} - ${cfg.max || '∞'}`;
            case 'format':
                return String(cfg.pattern || '');
            case 'terminology':
                return String(cfg.term || '');
            case 'tone':
                return String(cfg.style || '');
            case 'coverage':
                return (cfg.topics as string[])?.join(', ') || '';
            default:
                return JSON.stringify(cfg);
        }
    }

    // Get placeholder based on type
    function getPlaceholder(type: ConstraintType): string {
        switch (type) {
            case 'forbidden_words':
                return '词1, 词2, 词3...';
            case 'word_count':
                return '最大字数，如 1000';
            case 'format':
                return '格式要求描述';
            case 'tone':
                return '语气风格，如：正式、轻松';
            case 'coverage':
                return '主题1, 主题2...';
            default:
                return '配置值';
        }
    }

    // Get global rules excluding terminology (handled by Terminology panel)
    const rules = React.useMemo(() => {
        if (!config) return [];
        return config.global.rules.filter((r) => r.type !== 'terminology');
    }, [config]);

    if (loading) {
        return (
            <div className="wn-p2-widget wn-constraint-editor-widget" role="region" aria-label={WN_STRINGS.constraintEditorPanel()}>
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>{WN_STRINGS.loading()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-constraint-editor-widget" role="region" aria-label={WN_STRINGS.constraintEditorPanel()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.constraintEditorPanel()}</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-button wn-settings-button--primary"
                        onClick={() => {
                            setIsEditing(true);
                            setFormState({ type: 'forbidden_words', level: 'warning', configValue: '' });
                        }}
                        aria-label={WN_STRINGS.constraintEditorAdd()}
                    >
                        <span className={codicon('add')} /> {WN_STRINGS.add()}
                    </button>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {isEditing ? (
                    <div className="wn-constraint-form" style={{ padding: '12px', background: 'var(--wn-bg-secondary)', borderRadius: '6px' }}>
                        <div className="wn-settings-field" style={{ marginBottom: '12px' }}>
                            <label className="wn-settings-label">类型</label>
                            <select
                                className="wn-settings-select"
                                value={formState.type}
                                onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value as ConstraintType }))}
                            >
                                <option value="forbidden_words">{WN_STRINGS.constraintTypeForbiddenWords()}</option>
                                <option value="word_count">{WN_STRINGS.constraintTypeWordCount()}</option>
                                <option value="format">{WN_STRINGS.constraintTypeFormat()}</option>
                                <option value="tone">{WN_STRINGS.constraintTypeTone()}</option>
                                <option value="coverage">{WN_STRINGS.constraintTypeCoverage()}</option>
                            </select>
                        </div>

                        <div className="wn-settings-field" style={{ marginBottom: '12px' }}>
                            <label className="wn-settings-label">级别</label>
                            <select
                                className="wn-settings-select"
                                value={formState.level}
                                onChange={(e) => setFormState((prev) => ({ ...prev, level: e.target.value as ConstraintLevel }))}
                            >
                                <option value="error">{WN_STRINGS.constraintLevelError()}</option>
                                <option value="warning">{WN_STRINGS.constraintLevelWarning()}</option>
                                <option value="info">{WN_STRINGS.constraintLevelInfo()}</option>
                            </select>
                        </div>

                        <div className="wn-settings-field" style={{ marginBottom: '12px' }}>
                            <label className="wn-settings-label">配置</label>
                            <input
                                type="text"
                                className="wn-settings-input"
                                value={formState.configValue}
                                onChange={(e) => setFormState((prev) => ({ ...prev, configValue: e.target.value }))}
                                placeholder={getPlaceholder(formState.type)}
                            />
                        </div>

                        <div className="wn-settings-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="wn-settings-button" onClick={handleCancel}>
                                {WN_STRINGS.cancel()}
                            </button>
                            <button
                                type="button"
                                className="wn-settings-button wn-settings-button--primary"
                                onClick={() => void handleCreate()}
                            >
                                {WN_STRINGS.add()}
                            </button>
                        </div>
                    </div>
                ) : rules.length === 0 ? (
                    <div className="wn-empty-state">
                        <span className={codicon('filter') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">{WN_STRINGS.constraintEditorEmpty()}</p>
                        <p className="wn-empty-state-description">{WN_STRINGS.constraintEditorEmptyHint()}</p>
                    </div>
                ) : (
                    <div role="list">
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                className="wn-constraint-item"
                                role="listitem"
                                style={{
                                    padding: '12px',
                                    marginBottom: '8px',
                                    background: 'var(--wn-bg-secondary)',
                                    borderRadius: '6px',
                                    opacity: rule.enabled ? 1 : 0.6,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={getConstraintLevelIcon(rule.level)} style={{ color: getConstraintLevelColor(rule.level) }} />
                                        <span style={{ fontWeight: 500 }}>{getConstraintTypeLabel(rule.type)}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--wn-text-tertiary)' }}>
                                            ({getConstraintLevelLabel(rule.level)})
                                        </span>
                                    </div>
                                    <div className="wn-list-item-actions" style={{ opacity: 1, display: 'flex', gap: '4px' }}>
                                        <button
                                            type="button"
                                            className="wn-settings-icon-button"
                                            onClick={() => void handleToggle(rule.id, !rule.enabled)}
                                            aria-label={rule.enabled ? WN_STRINGS.constraintDisabled() : WN_STRINGS.constraintEnabled()}
                                            title={rule.enabled ? WN_STRINGS.constraintDisabled() : WN_STRINGS.constraintEnabled()}
                                        >
                                            <span className={codicon(rule.enabled ? 'eye' : 'eye-closed')} />
                                        </button>
                                        <button
                                            type="button"
                                            className="wn-settings-icon-button"
                                            onClick={() => void handleDelete(rule.id)}
                                            aria-label={WN_STRINGS.delete()}
                                        >
                                            <span className={codicon('trash')} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--wn-text-secondary)' }}>
                                    {formatConfigForDisplay(rule)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

@injectable()
export class ConstraintEditorWidget extends ReactWidget {
    static readonly ID = WRITENOW_CONSTRAINT_EDITOR_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = ConstraintEditorWidget.ID;
        this.title.label = WN_STRINGS.constraintEditorPanel();
        this.title.caption = WN_STRINGS.constraintEditorCaption();
        this.title.iconClass = codicon('filter');
        this.title.closable = true;
        this.addClass('writenow-constraint-editor');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <ConstraintEditorView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
