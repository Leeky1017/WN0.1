import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_MEMORY_VIEWER_WIDGET_ID } from '../writenow-layout-ids';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WN_STRINGS } from '../i18n/nls';
import type { UserMemory, UserMemoryType } from '../../common/ipc-generated';

/**
 * Get display label for memory type.
 */
function getMemoryTypeLabel(type: UserMemoryType): string {
    switch (type) {
        case 'preference':
            return WN_STRINGS.memoryTypePreference();
        case 'feedback':
            return WN_STRINGS.memoryTypeFeedback();
        case 'style':
            return WN_STRINGS.memoryTypeStyle();
        default:
            return type;
    }
}

/**
 * Get display label for memory origin.
 */
function getMemoryOriginLabel(origin: 'manual' | 'learned'): string {
    switch (origin) {
        case 'manual':
            return WN_STRINGS.memoryOriginManual();
        case 'learned':
            return WN_STRINGS.memoryOriginLearned();
        default:
            return origin;
    }
}

/**
 * Format date for display.
 */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Memory viewer component.
 *
 * Why: Exposes memory:list/update/delete IPC to allow users to manage AI memories.
 */
function MemoryViewerView(props: {
    frontendService: WritenowFrontendService;
    messageService: MessageService;
}): React.ReactElement {
    const { frontendService, messageService } = props;

    const [memories, setMemories] = React.useState<UserMemory[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [filterType, setFilterType] = React.useState<UserMemoryType | 'all'>('all');
    const [editingMemory, setEditingMemory] = React.useState<UserMemory | null>(null);
    const [editContent, setEditContent] = React.useState('');

    // Load memories
    React.useEffect(() => {
        const load = async (): Promise<void> => {
            setLoading(true);
            try {
                const res = await frontendService.invokeResponse('memory:list', {
                    scope: 'all',
                    includeLearned: true,
                });
                if (res.ok) {
                    setMemories(res.data.items);
                } else {
                    messageService.error(WN_STRINGS.memoryLoadFailed(res.error.message));
                }
            } catch (error) {
                messageService.error(WN_STRINGS.memoryLoadFailed(String(error)));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [frontendService, messageService]);

    const handleEdit = (memory: UserMemory): void => {
        setEditingMemory(memory);
        setEditContent(memory.content);
    };

    const handleCancelEdit = (): void => {
        setEditingMemory(null);
        setEditContent('');
    };

    const handleSaveEdit = async (): Promise<void> => {
        if (!editingMemory || !editContent.trim()) {
            return;
        }

        try {
            const res = await frontendService.invokeResponse('memory:update', {
                id: editingMemory.id,
                content: editContent.trim(),
            });
            if (res.ok) {
                setMemories((prev) =>
                    prev.map((m) => (m.id === editingMemory.id ? res.data.item : m))
                );
                messageService.info(WN_STRINGS.memoryUpdateSuccess());
                handleCancelEdit();
            } else {
                messageService.error(WN_STRINGS.memoryUpdateFailed(res.error.message));
            }
        } catch (error) {
            messageService.error(WN_STRINGS.memoryUpdateFailed(String(error)));
        }
    };

    const handleDelete = async (id: string): Promise<void> => {
        try {
            const res = await frontendService.invokeResponse('memory:delete', { id });
            if (res.ok) {
                setMemories((prev) => prev.filter((m) => m.id !== id));
                messageService.info(WN_STRINGS.memoryDeleteSuccess());
            } else {
                messageService.error(WN_STRINGS.memoryDeleteFailed(res.error.message));
            }
        } catch (error) {
            messageService.error(WN_STRINGS.memoryDeleteFailed(String(error)));
        }
    };

    const filteredMemories = React.useMemo(() => {
        if (filterType === 'all') {
            return memories;
        }
        return memories.filter((m) => m.type === filterType);
    }, [memories, filterType]);

    // Group memories by type for display
    const groupedMemories = React.useMemo(() => {
        const groups: Record<string, UserMemory[]> = {};
        for (const memory of filteredMemories) {
            const key = memory.type;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(memory);
        }
        return groups;
    }, [filteredMemories]);

    if (loading) {
        return (
            <div className="wn-p2-widget wn-memory-viewer-widget" role="region" aria-label={WN_STRINGS.memoryViewerPanel()}>
                <div className="wn-empty-state">
                    <span className={codicon('loading') + ' codicon-modifier-spin'} />
                    <p>{WN_STRINGS.loading()}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wn-p2-widget wn-memory-viewer-widget" role="region" aria-label={WN_STRINGS.memoryViewerPanel()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.memoryViewerPanel()}</h2>
                <div className="wn-p2-widget-actions">
                    <select
                        className="wn-settings-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as UserMemoryType | 'all')}
                        aria-label="Filter by type"
                    >
                        <option value="all">{WN_STRINGS.all()}</option>
                        <option value="preference">{WN_STRINGS.memoryTypePreference()}</option>
                        <option value="feedback">{WN_STRINGS.memoryTypeFeedback()}</option>
                        <option value="style">{WN_STRINGS.memoryTypeStyle()}</option>
                    </select>
                </div>
            </header>

            <div className="wn-p2-widget-content">
                {filteredMemories.length === 0 ? (
                    <div className="wn-empty-state">
                        <span className={codicon('lightbulb') + ' wn-empty-state-icon'} />
                        <p className="wn-empty-state-title">{WN_STRINGS.memoryViewerEmpty()}</p>
                        <p className="wn-empty-state-description">{WN_STRINGS.memoryViewerEmptyHint()}</p>
                    </div>
                ) : (
                    Object.entries(groupedMemories).map(([type, items]) => (
                        <div key={type} className="wn-memory-group" style={{ marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--wn-text-primary)' }}>
                                {getMemoryTypeLabel(type as UserMemoryType)}
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--wn-text-tertiary)' }}>
                                    ({items.length})
                                </span>
                            </h3>
                            <div role="list">
                                {items.map((memory) => (
                                    <div
                                        key={memory.id}
                                        className="wn-memory-item"
                                        role="listitem"
                                        style={{
                                            padding: '12px',
                                            marginBottom: '8px',
                                            background: 'var(--wn-bg-secondary)',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        {editingMemory?.id === memory.id ? (
                                            <div className="wn-memory-edit-form">
                                                <textarea
                                                    className="wn-settings-input"
                                                    rows={3}
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    placeholder={WN_STRINGS.memoryContentPlaceholder()}
                                                />
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        className="wn-settings-button"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        {WN_STRINGS.cancel()}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="wn-settings-button wn-settings-button--primary"
                                                        onClick={() => void handleSaveEdit()}
                                                    >
                                                        {WN_STRINGS.save()}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1, color: 'var(--wn-text-primary)', lineHeight: 1.5 }}>
                                                        {memory.content}
                                                    </div>
                                                    <div className="wn-list-item-actions" style={{ opacity: 1, marginLeft: '8px' }}>
                                                        <button
                                                            type="button"
                                                            className="wn-settings-icon-button"
                                                            onClick={() => handleEdit(memory)}
                                                            aria-label={`${WN_STRINGS.edit()}`}
                                                        >
                                                            <span className={codicon('edit')} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="wn-settings-icon-button"
                                                            onClick={() => void handleDelete(memory.id)}
                                                            aria-label={`${WN_STRINGS.delete()}`}
                                                        >
                                                            <span className={codicon('trash')} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--wn-text-tertiary)' }}>
                                                    <span>
                                                        {getMemoryOriginLabel(memory.origin)}
                                                    </span>
                                                    <span>
                                                        {memory.projectId ? WN_STRINGS.memoryScopeProject() : WN_STRINGS.memoryScopeGlobal()}
                                                    </span>
                                                    <span>
                                                        {formatDate(memory.createdAt)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

@injectable()
export class MemoryViewerWidget extends ReactWidget {
    static readonly ID = WRITENOW_MEMORY_VIEWER_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService)
        private readonly frontendService: WritenowFrontendService,
        @inject(MessageService)
        private readonly messageService: MessageService
    ) {
        super();
        this.id = MemoryViewerWidget.ID;
        this.title.label = WN_STRINGS.memoryViewerPanel();
        this.title.caption = WN_STRINGS.memoryViewerCaption();
        this.title.iconClass = codicon('lightbulb');
        this.title.closable = true;
        this.addClass('writenow-memory-viewer');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <MemoryViewerView
                frontendService={this.frontendService}
                messageService={this.messageService}
            />
        );
    }
}
