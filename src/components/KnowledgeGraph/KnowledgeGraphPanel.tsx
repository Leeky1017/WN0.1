import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { useKnowledgeGraphStore } from '../../stores/knowledgeGraphStore';
import { useProjectsStore } from '../../stores/projectsStore';

import type { KnowledgeGraphEntity, KnowledgeGraphEntityType, KnowledgeGraphRelation } from '../../types/models';
import { EntityEditor } from './EntityEditor';

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function layoutCircle(entities: KnowledgeGraphEntity[]): Map<string, NodePos> {
  const map = new Map<string, NodePos>();
  if (entities.length === 0) return map;

  const radius = Math.max(140, Math.min(260, entities.length * 24));
  const centerX = 0;
  const centerY = 0;

  for (let i = 0; i < entities.length; i += 1) {
    const e = entities[i];
    const angle = (2 * Math.PI * i) / entities.length;
    map.set(e.id, {
      id: e.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  return map;
}

function entityColor(type: KnowledgeGraphEntityType) {
  if (type === 'Character') return '#6D7CFF';
  if (type === 'Location') return '#2EC4B6';
  if (type === 'Event') return '#FF9F1C';
  if (type === 'TimePoint') return '#C77DFF';
  if (type === 'Item') return '#E71D36';
  return '#9CA3AF';
}

function buildEntityLabel(entity: KnowledgeGraphEntity) {
  const name = entity.name.trim();
  return name.length > 12 ? `${name.slice(0, 12)}…` : name;
}

function useSelectedEntity(entities: KnowledgeGraphEntity[], selectedId: string | null) {
  return useMemo(() => {
    if (!selectedId) return null;
    return entities.find((e) => e.id === selectedId) ?? null;
  }, [entities, selectedId]);
}

function useSelectedRelation(relations: KnowledgeGraphRelation[], selectedId: string | null) {
  return useMemo(() => {
    if (!selectedId) return null;
    return relations.find((r) => r.id === selectedId) ?? null;
  }, [relations, selectedId]);
}

const ENTITY_TYPES: KnowledgeGraphEntityType[] = ['Character', 'Location', 'Event', 'TimePoint', 'Item'];

export function KnowledgeGraphPanel() {
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);

  const entities = useKnowledgeGraphStore((s) => s.entities);
  const relations = useKnowledgeGraphStore((s) => s.relations);
  const selectedEntityId = useKnowledgeGraphStore((s) => s.selectedEntityId);
  const selectedRelationId = useKnowledgeGraphStore((s) => s.selectedRelationId);
  const isLoading = useKnowledgeGraphStore((s) => s.isLoading);
  const error = useKnowledgeGraphStore((s) => s.error);
  const refresh = useKnowledgeGraphStore((s) => s.refresh);
  const selectEntity = useKnowledgeGraphStore((s) => s.selectEntity);
  const selectRelation = useKnowledgeGraphStore((s) => s.selectRelation);
  const createEntity = useKnowledgeGraphStore((s) => s.createEntity);
  const updateEntity = useKnowledgeGraphStore((s) => s.updateEntity);
  const deleteEntity = useKnowledgeGraphStore((s) => s.deleteEntity);
  const createRelation = useKnowledgeGraphStore((s) => s.createRelation);
  const deleteRelation = useKnowledgeGraphStore((s) => s.deleteRelation);

  const selectedEntity = useSelectedEntity(entities, selectedEntityId);
  const selectedRelation = useSelectedRelation(relations, selectedRelationId);

  const positions = useMemo(() => layoutCircle(entities), [entities]);

  const [view, setView] = useState<ViewTransform>({ x: 180, y: 160, scale: 1 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false });

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh, currentProjectId]);

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
    dragRef.current = {
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
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    setView((prev) => ({ ...prev, x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy }));
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    dragRef.current.active = false;
  };

  const [createNodeOpen, setCreateNodeOpen] = useState(false);
  const [createNodeType, setCreateNodeType] = useState<KnowledgeGraphEntityType>('Character');
  const [createNodeName, setCreateNodeName] = useState('');
  const [createNodeDescription, setCreateNodeDescription] = useState('');
  const [createNodeError, setCreateNodeError] = useState<string | null>(null);

  const submitCreateNode = async () => {
    setCreateNodeError(null);
    const name = createNodeName.trim();
    if (!name) {
      setCreateNodeError('请输入名称');
      return;
    }
    const created = await createEntity({ type: createNodeType, name, description: createNodeDescription.trim() || undefined });
    if (!created) {
      setCreateNodeError(useKnowledgeGraphStore.getState().error ?? '创建失败');
      return;
    }
    setCreateNodeOpen(false);
    setCreateNodeName('');
    setCreateNodeDescription('');
  };

  const [createRelOpen, setCreateRelOpen] = useState(false);
  const [createRelFrom, setCreateRelFrom] = useState('');
  const [createRelTo, setCreateRelTo] = useState('');
  const [createRelType, setCreateRelType] = useState('关系');
  const [createRelError, setCreateRelError] = useState<string | null>(null);

  const submitCreateRelation = async () => {
    setCreateRelError(null);
    const fromId = createRelFrom.trim();
    const toId = createRelTo.trim();
    const type = createRelType.trim();
    if (!fromId || !toId || !type) {
      setCreateRelError('请填写完整关系信息');
      return;
    }
    const created = await createRelation({ fromEntityId: fromId, toEntityId: toId, type });
    if (!created) {
      setCreateRelError(useKnowledgeGraphStore.getState().error ?? '创建失败');
      return;
    }
    setCreateRelOpen(false);
  };

  const clearSelection = () => {
    selectEntity(null);
    selectRelation(null);
  };

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">知识图谱</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCreateRelOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            title="新增关系"
            disabled={!currentProjectId || isLoading || entities.length < 2}
          >
            <Link2 className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            type="button"
            onClick={() => setCreateNodeOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            title="新增节点"
            disabled={!currentProjectId || isLoading}
          >
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            type="button"
            onClick={() => refresh().catch(() => undefined)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-3 text-[12px] text-red-400 border-b border-[var(--border-subtle)]">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 relative overflow-hidden"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg className="absolute inset-0 w-full h-full select-none" role="img" aria-label="Knowledge graph">
            <defs>
              <marker id="wn-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="rgba(148,163,184,0.8)" />
              </marker>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="transparent"
              onClick={() => {
                if (dragRef.current.moved) return;
                clearSelection();
              }}
            />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
              {relations.map((rel) => {
                const from = positions.get(rel.fromEntityId);
                const to = positions.get(rel.toEntityId);
                if (!from || !to) return null;
                const selected = rel.id === selectedRelationId;
                return (
                  <g key={rel.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={selected ? 'rgba(109,124,255,0.95)' : 'rgba(148,163,184,0.55)'}
                      strokeWidth={selected ? 2.5 : 1.5}
                      markerEnd="url(#wn-arrow)"
                      pointerEvents="none"
                    />
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="transparent"
                      strokeWidth={12}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (dragRef.current.moved) return;
                        selectRelation(rel.id);
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
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragRef.current.moved) return;
                      selectEntity(entity.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle r={selected ? 18 : 16} fill={fill} opacity={selected ? 0.95 : 0.75} stroke={selected ? '#FFFFFF' : 'transparent'} strokeWidth={2} />
                    <text x={0} y={36} textAnchor="middle" fontSize={12} fill="rgba(226,232,240,0.9)">
                      {buildEntityLabel(entity)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          {entities.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[13px] text-[var(--text-tertiary)] mb-1">暂无节点</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">点击右上角「+」新增节点</div>
              </div>
            </div>
          )}
        </div>

        <div className="w-[170px] border-l border-[var(--border-subtle)] p-3 overflow-y-auto">
          {!selectedEntity && !selectedRelation && (
            <div className="text-[12px] text-[var(--text-tertiary)]">选择节点或关系查看详情</div>
          )}

          {selectedEntity && (
            <EntityEditor
              key={selectedEntity.id}
              entity={selectedEntity}
              isLoading={isLoading}
              onSave={async (input) => {
                const updated = await updateEntity({ id: input.id, name: input.name, description: input.description });
                if (!updated) throw new Error(useKnowledgeGraphStore.getState().error ?? '保存失败');
              }}
              onDelete={async (id) => {
                await deleteEntity(id);
                const nextError = useKnowledgeGraphStore.getState().error;
                if (nextError) throw new Error(nextError);
              }}
            />
          )}

          {selectedRelation && (
            <div className="space-y-3">
              <div className="text-[12px] text-[var(--text-tertiary)]">关系</div>
              <div className="text-[13px] text-[var(--text-secondary)]">{selectedRelation.type}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] break-words">
                {selectedRelation.fromEntityId} → {selectedRelation.toEntityId}
              </div>
              <button
                type="button"
                onClick={() => deleteRelation(selectedRelation.id).catch(() => undefined)}
                className="w-full h-8 px-2 rounded-md bg-red-500/80 hover:bg-red-500 text-[12px] text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {createNodeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={() => setCreateNodeOpen(false)}>
          <div className="wn-elevated p-5 w-[420px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">新增节点</div>
            <div className="space-y-3">
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">类型</div>
                <select
                  aria-label="Type"
                  value={createNodeType}
                  onChange={(e) => setCreateNodeType(e.target.value as KnowledgeGraphEntityType)}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                >
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">名称</div>
                <input
                  value={createNodeName}
                  onChange={(e) => setCreateNodeName(e.target.value)}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="节点名称"
                  spellCheck={false}
                />
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">描述</div>
                <textarea
                  value={createNodeDescription}
                  onChange={(e) => setCreateNodeDescription(e.target.value)}
                  className="w-full min-h-[88px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
                  spellCheck={false}
                />
              </div>
            </div>

            {createNodeError && <div className="mt-2 text-[12px] text-red-400">{createNodeError}</div>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => submitCreateNode().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                创建
              </button>
              <button
                type="button"
                onClick={() => setCreateNodeOpen(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {createRelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={() => setCreateRelOpen(false)}>
          <div className="wn-elevated p-5 w-[420px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">新增关系</div>
            <div className="space-y-3">
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">From</div>
                <select
                  aria-label="From"
                  value={createRelFrom}
                  onChange={(e) => setCreateRelFrom(e.target.value)}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="">选择节点</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">To</div>
                <select
                  aria-label="To"
                  value={createRelTo}
                  onChange={(e) => setCreateRelTo(e.target.value)}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="">选择节点</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[12px] text-[var(--text-tertiary)] mb-2">关系类型</div>
                <input
                  value={createRelType}
                  onChange={(e) => setCreateRelType(e.target.value)}
                  className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="关系类型"
                  spellCheck={false}
                />
              </div>
            </div>

            {createRelError && <div className="mt-2 text-[12px] text-red-400">{createRelError}</div>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => submitCreateRelation().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                创建
              </button>
              <button
                type="button"
                onClick={() => setCreateRelOpen(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
