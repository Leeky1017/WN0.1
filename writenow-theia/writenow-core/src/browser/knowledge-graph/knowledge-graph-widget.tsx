import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';

import type { KnowledgeGraphEntity, KnowledgeGraphRelation } from '../../common/ipc-generated';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WRITENOW_KNOWLEDGE_GRAPH_WIDGET_ID } from '../writenow-layout-ids';

type ViewTransform = {
    x: number;
    y: number;
    scale: number;
};

type NodePos = {
    id: string;
    x: number;
    y: number;
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function layoutCircle(entities: readonly KnowledgeGraphEntity[]): Map<string, NodePos> {
    const map = new Map<string, NodePos>();
    if (entities.length === 0) return map;

    const radius = Math.max(140, Math.min(260, entities.length * 24));
    const centerX = 0;
    const centerY = 0;

    for (let i = 0; i < entities.length; i += 1) {
        const entity = entities[i];
        const angle = (2 * Math.PI * i) / entities.length;
        map.set(entity.id, {
            id: entity.id,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
    }

    return map;
}

function entityColor(type: string): string {
    if (type === 'Character') return '#4F46E5';
    if (type === 'Location') return '#0EA5E9';
    if (type === 'Event') return '#F97316';
    if (type === 'TimePoint') return '#22C55E';
    if (type === 'Item') return '#A855F7';
    return '#6B7280';
}

function buildEntityLabel(entity: KnowledgeGraphEntity): string {
    const name = entity.name.trim();
    return name.length > 14 ? `${name.slice(0, 14)}…` : name;
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function formatError(error: unknown): string {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.message || error.name;
    return String(error);
}

type KnowledgeGraphViewProps = Readonly<{
    writenow: WritenowFrontendService;
    refreshNonce: number;
}>;

const DEFAULT_ENTITY_TYPES = ['Character', 'Location', 'Event', 'TimePoint', 'Item'] as const;

function KnowledgeGraphView(props: KnowledgeGraphViewProps): React.ReactElement {
    const { writenow, refreshNonce } = props;

    const [projectId, setProjectId] = React.useState<string | null>(null);
    const [entities, setEntities] = React.useState<KnowledgeGraphEntity[]>([]);
    const [relations, setRelations] = React.useState<KnowledgeGraphRelation[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [selectedEntityId, setSelectedEntityId] = React.useState<string | null>(null);
    const [selectedRelationId, setSelectedRelationId] = React.useState<string | null>(null);

    const [positions, setPositions] = React.useState<Map<string, NodePos>>(() => new Map());
    const [view, setView] = React.useState<ViewTransform>({ x: 240, y: 200, scale: 1 });

    const viewDragRef = React.useRef<{
        active: boolean;
        startX: number;
        startY: number;
        baseX: number;
        baseY: number;
        moved: boolean;
    }>({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false });

    const nodeDragRef = React.useRef<{
        active: boolean;
        nodeId: string;
        startX: number;
        startY: number;
        baseNodeX: number;
        baseNodeY: number;
        moved: boolean;
    } | null>(null);

    const selectedEntity = React.useMemo(() => {
        if (!selectedEntityId) return null;
        return entities.find((e) => e.id === selectedEntityId) ?? null;
    }, [entities, selectedEntityId]);

    const selectedRelation = React.useMemo(() => {
        if (!selectedRelationId) return null;
        return relations.find((r) => r.id === selectedRelationId) ?? null;
    }, [relations, selectedRelationId]);

    const loadProjectId = React.useCallback(async (): Promise<string | null> => {
        try {
            const bootstrap = await writenow.invokeResponse('project:bootstrap', {});
            if (!bootstrap.ok) {
                setError(`${bootstrap.error.code}: ${bootstrap.error.message}`);
                return null;
            }
            return bootstrap.data.currentProjectId;
        } catch (err) {
            setError(formatError(err));
            return null;
        }
    }, [writenow]);

    const loadGraph = React.useCallback(
        async (pid: string): Promise<void> => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:graph:get', { projectId: pid });
                if (!res.ok) {
                    setEntities([]);
                    setRelations([]);
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                setEntities(res.data.entities);
                setRelations(res.data.relations);
            } catch (err) {
                setEntities([]);
                setRelations([]);
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [writenow],
    );

    React.useEffect(() => {
        void loadProjectId().then((pid) => {
            if (!pid) return;
            setProjectId(pid);
        });
    }, [loadProjectId]);

    React.useEffect(() => {
        if (!projectId) return;
        void loadGraph(projectId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, refreshNonce]);

    React.useEffect(() => {
        setPositions((prev) => {
            const base = layoutCircle(entities);
            const next = new Map<string, NodePos>();
            for (const entity of entities) {
                const existing = prev.get(entity.id);
                if (existing) {
                    next.set(entity.id, existing);
                    continue;
                }
                const suggested = base.get(entity.id);
                next.set(entity.id, suggested ?? { id: entity.id, x: 0, y: 0 });
            }
            return next;
        });
    }, [entities]);

    const clearSelection = React.useCallback(() => {
        setSelectedEntityId(null);
        setSelectedRelationId(null);
    }, []);

    const refresh = React.useCallback(() => {
        if (!projectId) return;
        void loadGraph(projectId);
    }, [loadGraph, projectId]);

    const createEntity = React.useCallback(
        async (input: Readonly<{ type: string; name: string; description?: string }>): Promise<void> => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:entity:create', {
                    projectId,
                    type: input.type,
                    name: input.name,
                    ...(input.description ? { description: input.description } : {}),
                });
                if (!res.ok) {
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                setSelectedEntityId(res.data.entity.id);
                setSelectedRelationId(null);
                await loadGraph(projectId);
            } catch (err) {
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [loadGraph, projectId, writenow],
    );

    const updateEntity = React.useCallback(
        async (input: Readonly<{ id: string; type: string; name: string; description?: string }>): Promise<void> => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:entity:update', {
                    projectId,
                    id: input.id,
                    type: input.type,
                    name: input.name,
                    description: input.description ?? '',
                });
                if (!res.ok) {
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                await loadGraph(projectId);
            } catch (err) {
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [loadGraph, projectId, writenow],
    );

    const deleteEntity = React.useCallback(
        async (id: string): Promise<void> => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:entity:delete', { projectId, id });
                if (!res.ok) {
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                clearSelection();
                await loadGraph(projectId);
            } catch (err) {
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [clearSelection, loadGraph, projectId, writenow],
    );

    const createRelation = React.useCallback(
        async (input: Readonly<{ fromEntityId: string; toEntityId: string; type: string }>): Promise<void> => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:relation:create', { projectId, ...input });
                if (!res.ok) {
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                setSelectedRelationId(res.data.relation.id);
                setSelectedEntityId(null);
                await loadGraph(projectId);
            } catch (err) {
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [loadGraph, projectId, writenow],
    );

    const updateRelation = React.useCallback(
        async (input: Readonly<{ id: string; fromEntityId: string; toEntityId: string; type: string }>): Promise<void> => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:relation:update', { projectId, ...input });
                if (!res.ok) {
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                await loadGraph(projectId);
            } catch (err) {
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [loadGraph, projectId, writenow],
    );

    const deleteRelation = React.useCallback(
        async (id: string): Promise<void> => {
            if (!projectId) return;
            setIsLoading(true);
            setError(null);
            try {
                const res = await writenow.invokeResponse('kg:relation:delete', { projectId, id });
                if (!res.ok) {
                    setError(`${res.error.code}: ${res.error.message}`);
                    return;
                }
                clearSelection();
                await loadGraph(projectId);
            } catch (err) {
                setError(formatError(err));
            } finally {
                setIsLoading(false);
            }
        },
        [clearSelection, loadGraph, projectId, writenow],
    );

    const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const direction = e.deltaY < 0 ? 1 : -1;
        const nextScale = clamp(view.scale * (direction > 0 ? 1.1 : 0.9), 0.35, 2.8);

        const worldX = (cx - view.x) / view.scale;
        const worldY = (cy - view.y) / view.scale;

        const nextX = cx - worldX * nextScale;
        const nextY = cy - worldY * nextScale;
        setView({ x: nextX, y: nextY, scale: nextScale });
    };

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const point = { x: e.clientX, y: e.clientY };
        viewDragRef.current = {
            active: true,
            startX: point.x,
            startY: point.y,
            baseX: view.x,
            baseY: view.y,
            moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        if (!viewDragRef.current.active) return;
        const dx = e.clientX - viewDragRef.current.startX;
        const dy = e.clientY - viewDragRef.current.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) viewDragRef.current.moved = true;
        setView((prev) => ({ ...prev, x: viewDragRef.current.baseX + dx, y: viewDragRef.current.baseY + dy }));
    };

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
        viewDragRef.current.active = false;
    };

    const onNodePointerDown = React.useCallback(
        (nodeId: string): React.PointerEventHandler<SVGGElement> =>
            (e) => {
                e.stopPropagation();
                const pos = positions.get(nodeId);
                if (!pos) return;
                nodeDragRef.current = {
                    active: true,
                    nodeId,
                    startX: e.clientX,
                    startY: e.clientY,
                    baseNodeX: pos.x,
                    baseNodeY: pos.y,
                    moved: false,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
            },
        [positions],
    );

    const onNodePointerMove: React.PointerEventHandler<SVGGElement> = (e) => {
        const drag = nodeDragRef.current;
        if (!drag || !drag.active) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;

        // Why: Node positions live in graph/world coordinates; pointer deltas are in viewport pixels.
        const worldDx = dx / view.scale;
        const worldDy = dy / view.scale;

        setPositions((prev) => {
            const next = new Map(prev);
            next.set(drag.nodeId, {
                id: drag.nodeId,
                x: drag.baseNodeX + worldDx,
                y: drag.baseNodeY + worldDy,
            });
            return next;
        });
    };

    const onNodePointerUp: React.PointerEventHandler<SVGGElement> = () => {
        if (nodeDragRef.current) nodeDragRef.current.active = false;
    };

    const [createEntityOpen, setCreateEntityOpen] = React.useState(false);
    const [createEntityType, setCreateEntityType] = React.useState<string>(DEFAULT_ENTITY_TYPES[0]);
    const [createEntityName, setCreateEntityName] = React.useState('');
    const [createEntityDescription, setCreateEntityDescription] = React.useState('');
    const [createEntityError, setCreateEntityError] = React.useState<string | null>(null);

    const submitCreateEntity = React.useCallback(async () => {
        setCreateEntityError(null);
        const name = createEntityName.trim();
        const type = createEntityType.trim();
        if (!name) {
            setCreateEntityError('Name is required.');
            return;
        }
        if (!type) {
            setCreateEntityError('Type is required.');
            return;
        }
        await createEntity({ type, name, description: createEntityDescription.trim() || undefined });
        setCreateEntityOpen(false);
        setCreateEntityName('');
        setCreateEntityDescription('');
    }, [createEntity, createEntityDescription, createEntityName, createEntityType]);

    const [createRelationOpen, setCreateRelationOpen] = React.useState(false);
    const [createRelationFrom, setCreateRelationFrom] = React.useState('');
    const [createRelationTo, setCreateRelationTo] = React.useState('');
    const [createRelationType, setCreateRelationType] = React.useState('related_to');
    const [createRelationError, setCreateRelationError] = React.useState<string | null>(null);

    const submitCreateRelation = React.useCallback(async () => {
        setCreateRelationError(null);
        const from = createRelationFrom.trim();
        const to = createRelationTo.trim();
        const type = createRelationType.trim();
        if (!from || !to || !type) {
            setCreateRelationError('from/to/type are required.');
            return;
        }
        await createRelation({ fromEntityId: from, toEntityId: to, type });
        setCreateRelationOpen(false);
    }, [createRelation, createRelationFrom, createRelationTo, createRelationType]);

    const onBackgroundClick: React.MouseEventHandler<HTMLDivElement> = () => {
        if (viewDragRef.current.moved) return;
        clearSelection();
    };

    const panelStyle: React.CSSProperties = {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        color: 'var(--theia-ui-font-color1)',
        background: 'var(--theia-editor-background)',
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: '1px solid var(--theia-border-color1)',
        gap: 10,
    };

    return (
        <div style={panelStyle}>
            <div style={toolbarStyle}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={codicon('graph')} style={{ fontSize: 16 }} />
                    Knowledge Graph
                    {projectId ? <span style={{ opacity: 0.6, fontSize: 12 }}>({projectId.slice(0, 8)})</span> : null}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        className="theia-button"
                        disabled={isLoading || !projectId}
                        onClick={() => {
                            setCreateEntityError(null);
                            setCreateEntityOpen(true);
                        }}
                    >
                        + Entity
                    </button>
                    <button
                        type="button"
                        className="theia-button"
                        disabled={isLoading || !projectId || entities.length < 2}
                        onClick={() => {
                            setCreateRelationError(null);
                            setCreateRelationOpen(true);
                        }}
                    >
                        + Relation
                    </button>
                    <button type="button" className="theia-button" disabled={isLoading || !projectId} onClick={refresh}>
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div style={{ padding: 10, borderBottom: '1px solid var(--theia-border-color1)', color: 'var(--theia-errorForeground)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
                        <button type="button" className="theia-button" onClick={refresh} disabled={isLoading || !projectId}>
                            Retry
                        </button>
                    </div>
                </div>
            ) : null}

            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Sidebar: list */}
                <div style={{ width: 240, borderRight: '1px solid var(--theia-border-color1)', overflow: 'auto' }}>
                    <div style={{ padding: 10, borderBottom: '1px solid var(--theia-border-color1)', opacity: 0.8, fontSize: 12 }}>
                        Entities ({entities.length})
                    </div>
                    {entities.map((entity) => (
                        <button
                            key={entity.id}
                            type="button"
                            onClick={() => {
                                setSelectedEntityId(entity.id);
                                setSelectedRelationId(null);
                            }}
                            className="theia-button"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                borderRadius: 0,
                                background: entity.id === selectedEntityId ? 'var(--theia-list-focusBackground)' : 'transparent',
                                border: 'none',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600 }}>{coerceString(entity.name) || '(unnamed)'}</span>
                                <span style={{ fontSize: 11, opacity: 0.7, color: entityColor(entity.type) }}>{entity.type}</span>
                            </div>
                        </button>
                    ))}

                    <div style={{ padding: 10, borderTop: '1px solid var(--theia-border-color1)', opacity: 0.8, fontSize: 12 }}>
                        Relations ({relations.length})
                    </div>
                    {relations.map((rel) => (
                        <button
                            key={rel.id}
                            type="button"
                            onClick={() => {
                                setSelectedRelationId(rel.id);
                                setSelectedEntityId(null);
                            }}
                            className="theia-button"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 10px',
                                borderRadius: 0,
                                background: rel.id === selectedRelationId ? 'var(--theia-list-focusBackground)' : 'transparent',
                                border: 'none',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600 }}>{coerceString(rel.type) || '(type)'}</span>
                                <span style={{ fontSize: 11, opacity: 0.7 }}>→</span>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.7, wordBreak: 'break-word' }}>
                                {rel.fromEntityId.slice(0, 6)}… → {rel.toEntityId.slice(0, 6)}…
                            </div>
                        </button>
                    ))}
                </div>

                {/* Graph */}
                <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                    <div
                        style={{ position: 'absolute', inset: 0 }}
                        onWheel={onWheel}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onClick={onBackgroundClick}
                    >
                        <svg width="100%" height="100%" style={{ display: 'block' }}>
                            <defs>
                                <marker
                                    id="wn-kg-arrow"
                                    viewBox="0 0 10 10"
                                    refX="9"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--theia-ui-font-color3)" />
                                </marker>
                            </defs>

                            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
                                {relations.map((rel) => {
                                    const from = positions.get(rel.fromEntityId);
                                    const to = positions.get(rel.toEntityId);
                                    if (!from || !to) return null;
                                    const selected = rel.id === selectedRelationId;
                                    const stroke = selected ? 'var(--theia-focusBorder)' : 'var(--theia-ui-font-color3)';
                                    return (
                                        <g key={rel.id}>
                                            <line
                                                x1={from.x}
                                                y1={from.y}
                                                x2={to.x}
                                                y2={to.y}
                                                stroke={stroke}
                                                strokeOpacity={selected ? 0.95 : 0.55}
                                                strokeWidth={selected ? 2.4 : 1.4}
                                                markerEnd="url(#wn-kg-arrow)"
                                                pointerEvents="none"
                                            />
                                            <line
                                                x1={from.x}
                                                y1={from.y}
                                                x2={to.x}
                                                y2={to.y}
                                                stroke="transparent"
                                                strokeWidth={12}
                                                onClick={(evt) => {
                                                    evt.stopPropagation();
                                                    if (viewDragRef.current.moved) return;
                                                    setSelectedRelationId(rel.id);
                                                    setSelectedEntityId(null);
                                                }}
                                            />
                                        </g>
                                    );
                                })}

                                {entities.map((entity) => {
                                    const pos = positions.get(entity.id);
                                    if (!pos) return null;
                                    const selected = entity.id === selectedEntityId;
                                    const fill = entityColor(entity.type);
                                    return (
                                        <g
                                            key={entity.id}
                                            transform={`translate(${pos.x} ${pos.y})`}
                                            onPointerDown={onNodePointerDown(entity.id)}
                                            onPointerMove={onNodePointerMove}
                                            onPointerUp={onNodePointerUp}
                                            onPointerCancel={onNodePointerUp}
                                            onClick={(evt) => {
                                                evt.stopPropagation();
                                                if (nodeDragRef.current?.moved) return;
                                                if (viewDragRef.current.moved) return;
                                                setSelectedEntityId(entity.id);
                                                setSelectedRelationId(null);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <circle
                                                r={selected ? 18 : 16}
                                                fill={fill}
                                                opacity={selected ? 0.95 : 0.78}
                                                stroke={selected ? 'var(--theia-ui-font-color1)' : 'transparent'}
                                                strokeWidth={2}
                                            />
                                            <text x={0} y={36} textAnchor="middle" fontSize={12} fill="var(--theia-ui-font-color2)">
                                                {buildEntityLabel(entity)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>

                        {entities.length === 0 && !isLoading ? (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center', opacity: 0.7 }}>
                                    <div style={{ fontSize: 13, marginBottom: 4 }}>No entities yet.</div>
                                    <div style={{ fontSize: 11 }}>Create an entity to start building your knowledge graph.</div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Details */}
                <div style={{ width: 320, borderLeft: '1px solid var(--theia-border-color1)', overflow: 'auto', padding: 10 }}>
                    {!selectedEntity && !selectedRelation ? (
                        <div style={{ opacity: 0.7, fontSize: 12 }}>Select an entity or relation to view and edit details.</div>
                    ) : null}

                    {selectedEntity ? (
                        <EntityDetails
                            key={selectedEntity.id}
                            entity={selectedEntity}
                            disabled={isLoading}
                            onSave={updateEntity}
                            onDelete={deleteEntity}
                        />
                    ) : null}

                    {selectedRelation ? (
                        <RelationDetails
                            key={selectedRelation.id}
                            relation={selectedRelation}
                            entities={entities}
                            disabled={isLoading}
                            onSave={updateRelation}
                            onDelete={deleteRelation}
                        />
                    ) : null}
                </div>
            </div>

            {createEntityOpen ? (
                <Modal
                    title="Create entity"
                    onClose={() => setCreateEntityOpen(false)}
                    actions={
                        <>
                            <button type="button" className="theia-button" onClick={() => setCreateEntityOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="theia-button theia-primary-button" onClick={() => void submitCreateEntity()}>
                                Create
                            </button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Type</span>
                            <select
                                value={createEntityType}
                                onChange={(e) => setCreateEntityType(e.target.value)}
                                style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                            >
                                {DEFAULT_ENTITY_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                                {DEFAULT_ENTITY_TYPES.includes(createEntityType as (typeof DEFAULT_ENTITY_TYPES)[number]) ? null : (
                                    <option value={createEntityType}>{createEntityType}</option>
                                )}
                            </select>
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Name</span>
                            <input
                                value={createEntityName}
                                onChange={(e) => setCreateEntityName(e.target.value)}
                                style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                                placeholder="Entity name"
                            />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Description</span>
                            <textarea
                                value={createEntityDescription}
                                onChange={(e) => setCreateEntityDescription(e.target.value)}
                                rows={4}
                                style={{ padding: 8, background: 'var(--theia-editor-background)', resize: 'vertical' }}
                            />
                        </label>

                        {createEntityError ? <div style={{ color: 'var(--theia-errorForeground)' }}>{createEntityError}</div> : null}
                    </div>
                </Modal>
            ) : null}

            {createRelationOpen ? (
                <Modal
                    title="Create relation"
                    onClose={() => setCreateRelationOpen(false)}
                    actions={
                        <>
                            <button type="button" className="theia-button" onClick={() => setCreateRelationOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="theia-button theia-primary-button" onClick={() => void submitCreateRelation()}>
                                Create
                            </button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>From</span>
                            <select
                                value={createRelationFrom}
                                onChange={(e) => setCreateRelationFrom(e.target.value)}
                                style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                            >
                                <option value="">Select entity</option>
                                {entities.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name} ({e.type})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>To</span>
                            <select
                                value={createRelationTo}
                                onChange={(e) => setCreateRelationTo(e.target.value)}
                                style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                            >
                                <option value="">Select entity</option>
                                {entities.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.name} ({e.type})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.8 }}>Type</span>
                            <input
                                value={createRelationType}
                                onChange={(e) => setCreateRelationType(e.target.value)}
                                style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                                placeholder="related_to"
                            />
                        </label>

                        {createRelationError ? <div style={{ color: 'var(--theia-errorForeground)' }}>{createRelationError}</div> : null}
                    </div>
                </Modal>
            ) : null}
        </div>
    );
}

type ModalProps = Readonly<{
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    actions: React.ReactNode;
}>;

function Modal(props: ModalProps): React.ReactElement {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onMouseDown={props.onClose}
        >
            <div
                style={{
                    width: 520,
                    maxWidth: 'calc(100vw - 40px)',
                    background: 'var(--theia-editor-background)',
                    border: '1px solid var(--theia-border-color1)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                    borderRadius: 8,
                    padding: 12,
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{props.title}</div>
                {props.children}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>{props.actions}</div>
            </div>
        </div>
    );
}

type EntityDetailsProps = Readonly<{
    entity: KnowledgeGraphEntity;
    disabled: boolean;
    onSave: (input: Readonly<{ id: string; type: string; name: string; description?: string }>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}>;

function EntityDetails(props: EntityDetailsProps): React.ReactElement {
    const [type, setType] = React.useState(props.entity.type);
    const [name, setName] = React.useState(props.entity.name);
    const [description, setDescription] = React.useState(props.entity.description ?? '');
    const [localError, setLocalError] = React.useState<string | null>(null);

    const onSave = React.useCallback(async () => {
        setLocalError(null);
        const nextName = name.trim();
        const nextType = type.trim();
        if (!nextName) {
            setLocalError('Name is required.');
            return;
        }
        if (!nextType) {
            setLocalError('Type is required.');
            return;
        }
        try {
            await props.onSave({ id: props.entity.id, type: nextType, name: nextName, description: description.trim() || undefined });
        } catch (err) {
            setLocalError(formatError(err));
        }
    }, [description, name, props, type]);

    const onDelete = React.useCallback(async () => {
        setLocalError(null);
        try {
            await props.onDelete(props.entity.id);
        } catch (err) {
            setLocalError(formatError(err));
        }
    }, [props]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Entity</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>id: {props.entity.id}</div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Type</span>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                    disabled={props.disabled}
                >
                    {DEFAULT_ENTITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                    {DEFAULT_ENTITY_TYPES.includes(type as (typeof DEFAULT_ENTITY_TYPES)[number]) ? null : <option value={type}>{type}</option>}
                </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Name</span>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                    disabled={props.disabled}
                />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Description</span>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    style={{ padding: 8, background: 'var(--theia-editor-background)', resize: 'vertical' }}
                    disabled={props.disabled}
                />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="theia-button theia-primary-button" onClick={() => void onSave()} disabled={props.disabled}>
                    Save
                </button>
                <button type="button" className="theia-button" onClick={() => void onDelete()} disabled={props.disabled}>
                    Delete
                </button>
            </div>

            {localError ? <div style={{ color: 'var(--theia-errorForeground)' }}>{localError}</div> : null}
        </div>
    );
}

type RelationDetailsProps = Readonly<{
    relation: KnowledgeGraphRelation;
    entities: readonly KnowledgeGraphEntity[];
    disabled: boolean;
    onSave: (input: Readonly<{ id: string; fromEntityId: string; toEntityId: string; type: string }>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}>;

function RelationDetails(props: RelationDetailsProps): React.ReactElement {
    const [fromEntityId, setFromEntityId] = React.useState(props.relation.fromEntityId);
    const [toEntityId, setToEntityId] = React.useState(props.relation.toEntityId);
    const [type, setType] = React.useState(props.relation.type);
    const [localError, setLocalError] = React.useState<string | null>(null);

    const onSave = React.useCallback(async () => {
        setLocalError(null);
        const nextFrom = fromEntityId.trim();
        const nextTo = toEntityId.trim();
        const nextType = type.trim();
        if (!nextFrom || !nextTo || !nextType) {
            setLocalError('from/to/type are required.');
            return;
        }
        try {
            await props.onSave({ id: props.relation.id, fromEntityId: nextFrom, toEntityId: nextTo, type: nextType });
        } catch (err) {
            setLocalError(formatError(err));
        }
    }, [fromEntityId, props, toEntityId, type]);

    const onDelete = React.useCallback(async () => {
        setLocalError(null);
        try {
            await props.onDelete(props.relation.id);
        } catch (err) {
            setLocalError(formatError(err));
        }
    }, [props]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Relation</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>id: {props.relation.id}</div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>From</span>
                <select
                    value={fromEntityId}
                    onChange={(e) => setFromEntityId(e.target.value)}
                    style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                    disabled={props.disabled}
                >
                    {props.entities.map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.name} ({e.type})
                        </option>
                    ))}
                </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>To</span>
                <select
                    value={toEntityId}
                    onChange={(e) => setToEntityId(e.target.value)}
                    style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                    disabled={props.disabled}
                >
                    {props.entities.map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.name} ({e.type})
                        </option>
                    ))}
                </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Type</span>
                <input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ height: 28, padding: '0 8px', background: 'var(--theia-editor-background)' }}
                    disabled={props.disabled}
                />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="theia-button theia-primary-button" onClick={() => void onSave()} disabled={props.disabled}>
                    Save
                </button>
                <button type="button" className="theia-button" onClick={() => void onDelete()} disabled={props.disabled}>
                    Delete
                </button>
            </div>

            {localError ? <div style={{ color: 'var(--theia-errorForeground)' }}>{localError}</div> : null}
        </div>
    );
}

@injectable()
export class KnowledgeGraphWidget extends ReactWidget {
    static readonly ID = WRITENOW_KNOWLEDGE_GRAPH_WIDGET_ID;

    private refreshNonce = 0;

    constructor(@inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService) {
        super();
        this.id = KnowledgeGraphWidget.ID;
        this.title.label = 'Knowledge Graph';
        this.title.caption = 'WriteNow Knowledge Graph';
        this.title.iconClass = codicon('graph');
        this.title.closable = true;

        this.addClass('writenow-knowledge-graph');
        this.update();
    }

    /**
     * Request the React view to reload its data.
     *
     * Why: Commands (e.g. selection → create entity) should be able to refresh the widget if it is already open.
     */
    requestRefresh(): void {
        this.refreshNonce += 1;
        this.update();
    }

    protected override render(): React.ReactNode {
        return <KnowledgeGraphView writenow={this.writenow} refreshNonce={this.refreshNonce} />;
    }
}

