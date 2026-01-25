import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_TERMINOLOGY_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import type { ConstraintsConfig, ConstraintRule } from '../../common/ipc-generated';

/**
 * Terminology entry type.
 */
type TerminologyEntry = {
    id: string;
    term: string;
    aliases: string[];
    definition: string;
};

/**
 * Terminology view component.
 *
 * Why: Uses constraints:get/set IPC to manage terminology rules.
 * Terminology is stored as a constraint rule with type 'terminology'.
 */
function TerminologyView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [entries, setEntries] = React.useState<TerminologyEntry[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [editingEntry, setEditingEntry] = React.useState<TerminologyEntry | null>(null);
    const [formState, setFormState] = React.useState({ term: '', aliases: '', definition: '' });

    // Load terminology from constraints
    React.useEffect(() => {
        const load = async (): Promise<void> => {
            setLoading(true);
            try {
                const res = await frontendService.invokeResponse('constraints:get', {});
                if (res.ok) {
                    const terminologyRules = res.data.config.global.rules.filter(
                        (r: ConstraintRule) => r.type === 'terminology'
                    );
                    const loadedEntries: TerminologyEntry[] = terminologyRules.map((rule: ConstraintRule) => ({
                        id: rule.id,
                        term: (rule.config as { term?: string }).term ?? '',
                        aliases: (rule.config as { aliases?: string[] }).aliases ?? [],
                        definition: (rule.config as { definition?: string }).definition ?? '',
                    }));
                    setEntries(loadedEntries);
                }
            } catch (error) {
                messageService.error(`加载术语表失败: ${String(error)}`);
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [frontendService, messageService]);

    const saveEntries = async (newEntries: TerminologyEntry[]): Promise<boolean> => {
        try {
            // Get current config
            const getRes = await frontendService.invokeResponse('constraints:get', {});
            if (!getRes.ok) {
                messageService.error(`获取配置失败: ${getRes.error.message}`);
                return false;
            }

            // Update terminology rules
            const config: ConstraintsConfig = {
                ...getRes.data.config,
                global: {
                    ...getRes.data.config.global,
                    rules: [
                        // Keep non-terminology rules
                        ...getRes.data.config.global.rules.filter((r: ConstraintRule) => r.type !== 'terminology'),
                        // Add updated terminology rules
                        ...newEntries.map((entry): ConstraintRule => ({
                            id: entry.id,
                            type: 'terminology',
                            enabled: true,
                            config: {
                                term: entry.term,
                                aliases: entry.aliases,
                                definition: entry.definition,
                            },
                            level: 'info',
                            scope: 'global',
                        })),
                    ],
                },
            };

            const setRes = await frontendService.invokeResponse('constraints:set', { config });

            if (!setRes.ok) {
                messageService.error(`保存失败: ${setRes.error.message}`);
                return false;
            }

            return true;
        } catch (error) {
            messageService.error(`保存失败: ${String(error)}`);
            return false;
        }
    };

    const handleCreate = async (): Promise<void> => {
        if (!formState.term.trim()) {
            messageService.warn('请输入术语');
            return;
        }

        const newEntry: TerminologyEntry = {
            id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            term: formState.term.trim(),
            aliases: formState.aliases
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            definition: formState.definition.trim(),
        };

        const newEntries = [...entries, newEntry];
        const success = await saveEntries(newEntries);
        if (success) {
            setEntries(newEntries);
            setFormState({ term: '', aliases: '', definition: '' });
            setIsEditing(false);
            messageService.info('术语添加成功');
        }
    };

    const handleUpdate = async (): Promise<void> => {
        if (!editingEntry || !formState.term.trim()) {
            return;
        }

        const updatedEntry: TerminologyEntry = {
            ...editingEntry,
            term: formState.term.trim(),
            aliases: formState.aliases
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            definition: formState.definition.trim(),
        };

        const newEntries = entries.map((e) => (e.id === editingEntry.id ? updatedEntry : e));
        const success = await saveEntries(newEntries);
        if (success) {
            setEntries(newEntries);
            setFormState({ term: '', aliases: '', definition: '' });
            setEditingEntry(null);
            setIsEditing(false);
            messageService.info('术语更新成功');
        }
    };

    const handleDelete = async (id: string): Promise<void> => {
        const newEntries = entries.filter((e) => e.id !== id);
        const success = await saveEntries(newEntries);
        if (success) {
            setEntries(newEntries);
            messageService.info('术语删除成功');
        }
    };

    const handleEdit = (entry: TerminologyEntry): void => {
        setEditingEntry(entry);
        setFormState({
            term: entry.term,
            aliases: entry.aliases.join(', '),
            definition: entry.definition,
        });
        setIsEditing(true);
    };

    const handleCancel = (): void => {
        setFormState({ term: '', aliases: '', definition: '' });
        setEditingEntry(null);
        setIsEditing(false);
    };

    const filteredEntries = React.useMemo(() => {
        if (!searchQuery.trim()) return entries;
        const query = searchQuery.toLowerCase();
        return entries.filter(
            (entry) =>
                entry.term.toLowerCase().includes(query) ||
                entry.aliases.some((a) => a.toLowerCase().includes(query)) ||
                entry.definition.toLowerCase().includes(query)
        );
    }, [entries, searchQuery]);

    if (loading) {
        return (
            <div className="wn-p2-widget wn-terminology-widget" role="region" aria-label="术语表">
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>加载中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-terminology-widget" role="region" aria-label="术语表">
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">术语表</h2>
                <div className="wn-p2-widget-actions">
                    <button
                        type="button"
                        className="wn-settings-button wn-settings-button--primary"
                        onClick={() => {
                            setIsEditing(true);
                            setEditingEntry(null);
                            setFormState({ term: '', aliases: '', definition: '' });
                        }}
                        aria-label="添加术语"
                    >
                        <span className={codicon('add')} /> 添加
                    </button>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {isEditing ? (
                    <div className="wn-terminology-form">
                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="term-name">
                                术语 *
                            </label>
                            <input
                                id="term-name"
                                type="text"
                                className="wn-settings-input"
                                value={formState.term}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, term: e.target.value }))
                                }
                                placeholder="术语名称"
                                aria-required="true"
                            />
                        </div>

                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="term-aliases">
                                别名（逗号分隔）
                            </label>
                            <input
                                id="term-aliases"
                                type="text"
                                className="wn-settings-input"
                                value={formState.aliases}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, aliases: e.target.value }))
                                }
                                placeholder="别名1, 别名2, ..."
                            />
                        </div>

                        <div className="wn-settings-field">
                            <label className="wn-settings-label" htmlFor="term-definition">
                                定义
                            </label>
                            <textarea
                                id="term-definition"
                                className="wn-settings-input"
                                rows={3}
                                value={formState.definition}
                                onChange={(e) =>
                                    setFormState((prev) => ({ ...prev, definition: e.target.value }))
                                }
                                placeholder="术语的定义或解释..."
                            />
                        </div>

                        <div className="wn-settings-actions" style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                className="wn-settings-button"
                                onClick={handleCancel}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                className="wn-settings-button wn-settings-button--primary"
                                onClick={editingEntry ? handleUpdate : handleCreate}
                            >
                                {editingEntry ? '保存' : '添加'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="wn-terminology-search">
                            <input
                                type="text"
                                className="wn-settings-input"
                                placeholder="搜索术语..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="搜索术语"
                            />
                        </div>

                        {filteredEntries.length === 0 ? (
                            <div className="wn-empty-state">
                                <span className={codicon('book') + ' wn-empty-state-icon'} />
                                <p className="wn-empty-state-title">
                                    {searchQuery ? '未找到匹配的术语' : '暂无术语'}
                                </p>
                                <p className="wn-empty-state-description">
                                    添加术语来统一作品中的专有名词
                                </p>
                            </div>
                        ) : (
                            <div role="list">
                                {filteredEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="wn-terminology-item"
                                        role="listitem"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div className="wn-terminology-term">{entry.term}</div>
                                            <div className="wn-list-item-actions" style={{ opacity: 1 }}>
                                                <button
                                                    type="button"
                                                    className="wn-settings-icon-button"
                                                    onClick={() => handleEdit(entry)}
                                                    aria-label={`编辑 ${entry.term}`}
                                                >
                                                    <span className={codicon('edit')} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="wn-settings-icon-button"
                                                    onClick={() => handleDelete(entry.id)}
                                                    aria-label={`删除 ${entry.term}`}
                                                >
                                                    <span className={codicon('trash')} />
                                                </button>
                                            </div>
                                        </div>
                                        {entry.definition && (
                                            <div className="wn-terminology-definition">
                                                {entry.definition}
                                            </div>
                                        )}
                                        {entry.aliases.length > 0 && (
                                            <div className="wn-terminology-aliases">
                                                别名：{entry.aliases.join('、')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

@injectable()
export class TerminologyWidget extends ReactWidget {
    static readonly ID = WRITENOW_TERMINOLOGY_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = TerminologyWidget.ID;
        this.title.label = '术语表';
        this.title.caption = '管理作品术语';
        this.title.iconClass = codicon('book');
        this.title.closable = true;
        this.addClass('writenow-terminology');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <TerminologyView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
