import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';

import type { IpcError, VersionListItem } from '../../common/ipc-generated';
import { ActiveEditorService } from '../active-editor-service';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WRITENOW_VERSION_HISTORY_WIDGET_ID } from '../writenow-layout-ids';
import { UnifiedDiffView } from './diff-view';

type LoadState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; value: T };

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function formatIpcError(error: IpcError): string {
    const msg = coerceString(error.message) || 'Unknown error';
    return `${error.code}: ${msg}`;
}

function formatTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatActor(actor: VersionListItem['actor']): string {
    if (actor === 'ai') return 'AI';
    if (actor === 'auto') return 'Auto';
    return 'User';
}

type VersionHistoryViewProps = Readonly<{
    writenow: WritenowFrontendService;
    activeEditor: ActiveEditorService;
}>;

function VersionHistoryView(props: VersionHistoryViewProps): React.ReactElement {
    const { writenow, activeEditor } = props;

    const [articleId, setArticleId] = React.useState<string | null>(null);
    const [snapshots, setSnapshots] = React.useState<LoadState<VersionListItem[]>>({ status: 'idle' });

    const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);
    const [selectedContent, setSelectedContent] = React.useState<LoadState<string>>({ status: 'idle' });

    const [diffLeftId, setDiffLeftId] = React.useState<string | null>(null);
    const [diffRightId, setDiffRightId] = React.useState<string | null>(null);
    const [diffState, setDiffState] = React.useState<LoadState<string>>({ status: 'idle' });

    const refreshSnapshots = React.useCallback(async () => {
        if (!articleId) {
            setSnapshots({ status: 'idle' });
            return;
        }

        setSnapshots({ status: 'loading' });
        try {
            const res = await writenow.invokeResponse('version:list', { articleId, limit: 50, cursor: '0' });
            if (!res.ok) {
                setSnapshots({ status: 'error', message: formatIpcError(res.error) });
                return;
            }
            setSnapshots({ status: 'ready', value: res.data.items });
        } catch (error) {
            setSnapshots({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }, [articleId, writenow]);

    React.useEffect(() => {
        const update = () => {
            const editor = activeEditor.getActive();
            const nextArticleId = editor?.getArticleId() ?? null;
            setArticleId(nextArticleId);

            // Why: Switching documents should reset selection/diff state to avoid accidental cross-document actions.
            setSelectedSnapshotId(null);
            setSelectedContent({ status: 'idle' });
            setDiffLeftId(null);
            setDiffRightId(null);
            setDiffState({ status: 'idle' });
        };

        update();
        const disposable = activeEditor.onDidChange(() => update());
        return () => disposable.dispose();
    }, [activeEditor]);

    React.useEffect(() => {
        void refreshSnapshots();
    }, [refreshSnapshots]);

    const selectedItem: VersionListItem | null = React.useMemo(() => {
        if (snapshots.status !== 'ready' || !selectedSnapshotId) return null;
        return snapshots.value.find((item) => item.id === selectedSnapshotId) ?? null;
    }, [selectedSnapshotId, snapshots]);

    const loadSelectedContent = React.useCallback(
        async (snapshotId: string) => {
            setSelectedSnapshotId(snapshotId);
            setSelectedContent({ status: 'loading' });
            try {
                const res = await writenow.invokeResponse('version:restore', { snapshotId });
                if (!res.ok) {
                    setSelectedContent({ status: 'error', message: formatIpcError(res.error) });
                    return;
                }
                setSelectedContent({ status: 'ready', value: res.data.content });
            } catch (error) {
                setSelectedContent({ status: 'error', message: error instanceof Error ? error.message : String(error) });
            }
        },
        [writenow],
    );

    const loadDiff = React.useCallback(async () => {
        if (!diffLeftId || !diffRightId || diffLeftId === diffRightId) {
            setDiffState({ status: 'idle' });
            return;
        }

        setDiffState({ status: 'loading' });
        try {
            const res = await writenow.invokeResponse('version:diff', { fromSnapshotId: diffLeftId, toSnapshotId: diffRightId });
            if (!res.ok) {
                setDiffState({ status: 'error', message: formatIpcError(res.error) });
                return;
            }
            setDiffState({ status: 'ready', value: res.data.diff });
        } catch (error) {
            setDiffState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }, [diffLeftId, diffRightId, writenow]);

    React.useEffect(() => {
        void loadDiff();
    }, [loadDiff]);

    const createSnapshot = React.useCallback(async () => {
        const editor = activeEditor.getActive();
        const activeArticleId = editor?.getArticleId();
        if (!editor || !activeArticleId) {
            setSnapshots({ status: 'error', message: 'No active editor.' });
            return;
        }

        const nameRaw = window.prompt('Snapshot name (optional):', '');
        if (nameRaw === null) return;
        const reasonRaw = window.prompt('Snapshot reason (optional):', '');
        if (reasonRaw === null) return;

        const name = nameRaw.trim() || undefined;
        const reason = reasonRaw.trim() || undefined;
        const content = editor.getMarkdown();

        try {
            const res = await writenow.invokeResponse('version:create', { articleId: activeArticleId, content, name, reason, actor: 'user' });
            if (!res.ok) {
                setSnapshots({ status: 'error', message: formatIpcError(res.error) });
                return;
            }
            await refreshSnapshots();
            void loadSelectedContent(res.data.snapshotId);
        } catch (error) {
            setSnapshots({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }, [activeEditor, loadSelectedContent, refreshSnapshots, writenow]);

    const rollbackToSelected = React.useCallback(async () => {
        const snapshotId = selectedSnapshotId;
        if (!snapshotId) return;

        const editor = activeEditor.getActive();
        const activeArticleId = editor?.getArticleId();
        if (!editor || !activeArticleId) {
            setSelectedContent({ status: 'error', message: 'No active editor.' });
            return;
        }

        const ok = window.confirm('Rollback will replace the editor content with the selected snapshot. Continue?');
        if (!ok) return;

        setSelectedContent({ status: 'loading' });
        try {
            const res = await writenow.invokeResponse('version:restore', { snapshotId });
            if (!res.ok) {
                setSelectedContent({ status: 'error', message: formatIpcError(res.error) });
                return;
            }
            if (res.data.articleId !== activeArticleId) {
                setSelectedContent({ status: 'error', message: `Snapshot belongs to a different document: ${res.data.articleId}` });
                return;
            }

            editor.setMarkdown(res.data.content);
            setSelectedContent({ status: 'ready', value: res.data.content });
        } catch (error) {
            setSelectedContent({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }, [activeEditor, selectedSnapshotId, writenow]);

    const renderList = () => {
        if (!articleId) {
            return <div style={{ fontSize: 12, opacity: 0.8 }}>Focus an editor tab to view its version history.</div>;
        }

        if (snapshots.status === 'loading') {
            return <div style={{ fontSize: 12, opacity: 0.8 }}>Loading…</div>;
        }

        if (snapshots.status === 'error') {
            return (
                <div style={{ fontSize: 12, color: 'var(--theia-errorForeground)' }} data-testid="writenow-version-history-error">
                    {snapshots.message}
                </div>
            );
        }

        if (snapshots.status !== 'ready' || snapshots.value.length === 0) {
            return <div style={{ fontSize: 12, opacity: 0.8 }}>No snapshots yet.</div>;
        }

        const sorted = [...snapshots.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sorted.map((item) => {
                    const isSelected = item.id === selectedSnapshotId;
                    return (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => void loadSelectedContent(item.id)}
                            style={{
                                border: '1px solid var(--theia-border-color1)',
                                borderRadius: 6,
                                padding: '8px 10px',
                                marginBottom: 8,
                                textAlign: 'left',
                                cursor: 'pointer',
                                background: isSelected ? 'var(--theia-sideBar-background)' : 'var(--theia-editor-background)',
                                color: 'var(--theia-ui-font-color1)',
                            }}
                            data-testid="writenow-version-history-item"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name || item.reason || '(untitled)'}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>{formatTime(item.createdAt)}</div>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                                {formatActor(item.actor)}
                                {item.reason ? ` · ${item.reason}` : ''}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderDetails = () => {
        if (!selectedItem) {
            return <div style={{ fontSize: 12, opacity: 0.8 }}>Select a snapshot to view details, diff, or rollback.</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedItem.name || selectedItem.reason || '(untitled)'}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {formatTime(selectedItem.createdAt)} · {formatActor(selectedItem.actor)}
                        {selectedItem.reason ? ` · ${selectedItem.reason}` : ''}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>id: {selectedItem.id}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setDiffLeftId(selectedItem.id)} style={{ height: 28 }}>
                        Set as Diff Left
                    </button>
                    <button type="button" onClick={() => setDiffRightId(selectedItem.id)} style={{ height: 28 }}>
                        Set as Diff Right
                    </button>
                    <button type="button" onClick={() => void rollbackToSelected()} style={{ height: 28 }}>
                        Rollback
                    </button>
                </div>

                <div style={{ border: '1px solid var(--theia-border-color1)', borderRadius: 6, padding: 10, background: 'var(--theia-editor-background)' }}>
                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>Content</div>
                    {selectedContent.status === 'loading' && <div style={{ fontSize: 12, opacity: 0.8 }}>Loading…</div>}
                    {selectedContent.status === 'error' && <div style={{ fontSize: 12, color: 'var(--theia-errorForeground)' }}>{selectedContent.message}</div>}
                    {selectedContent.status === 'ready' && (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.5 }}>
                            {selectedContent.value}
                        </pre>
                    )}
                    {selectedContent.status === 'idle' && <div style={{ fontSize: 12, opacity: 0.8 }}>Select to load content.</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                        Diff: {diffLeftId ? diffLeftId : '(none)'} → {diffRightId ? diffRightId : '(none)'}
                    </div>
                    {diffState.status === 'loading' && <div style={{ fontSize: 12, opacity: 0.8 }}>Computing diff…</div>}
                    {diffState.status === 'error' && <div style={{ fontSize: 12, color: 'var(--theia-errorForeground)' }}>{diffState.message}</div>}
                    {diffState.status === 'ready' && <UnifiedDiffView diff={diffState.value} />}
                    {diffState.status === 'idle' && <div style={{ fontSize: 12, opacity: 0.8 }}>Pick two snapshots to compare.</div>}
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                padding: 10,
                gap: 10,
                color: 'var(--theia-ui-font-color1)',
            }}
            data-testid="writenow-version-history"
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Version History</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{articleId ? `Document: ${articleId}` : 'No active document'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => void refreshSnapshots()} disabled={!articleId || snapshots.status === 'loading'} style={{ height: 28 }}>
                        Refresh
                    </button>
                    <button type="button" onClick={() => void createSnapshot()} disabled={!articleId} style={{ height: 28 }}>
                        Save Version
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 10, minHeight: 0 }}>
                <div style={{ overflow: 'auto', minHeight: 0 }} data-testid="writenow-version-history-list">
                    {renderList()}
                </div>
                <div style={{ overflow: 'auto', minHeight: 0 }} data-testid="writenow-version-history-detail">
                    {renderDetails()}
                </div>
            </div>
        </div>
    );
}

@injectable()
export class VersionHistoryWidget extends ReactWidget {
    static readonly ID = WRITENOW_VERSION_HISTORY_WIDGET_ID;

    constructor(
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {
        super();
        this.id = VersionHistoryWidget.ID;
        this.title.label = 'Version History';
        this.title.caption = 'WriteNow Version History';
        this.title.iconClass = codicon('history');
        this.title.closable = true;
        this.addClass('writenow-version-history');
        this.update();
    }

    protected override render(): React.ReactNode {
        return <VersionHistoryView writenow={this.writenow} activeEditor={this.activeEditor} />;
    }
}

