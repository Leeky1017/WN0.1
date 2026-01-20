import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';

import type { KnowledgeGraphEntity } from '../../types/models';

interface EntityEditorProps {
  entity: KnowledgeGraphEntity;
  isLoading: boolean;
  onSave: (input: { id: string; name: string; description?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EntityEditor({ entity, isLoading, onSave, onDelete }: EntityEditorProps) {
  const [name, setName] = useState(() => entity.name);
  const [description, setDescription] = useState(() => entity.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => Boolean(name.trim()), [name]);

  const submitSave = async () => {
    setError(null);
    const nextName = name.trim();
    if (!nextName) {
      setError('名称不能为空');
      return;
    }
    try {
      await onSave({ id: entity.id, name: nextName, description: description.trim() || undefined });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[12px] text-[var(--text-tertiary)]">节点</div>
      <div>
        <div className="text-[11px] text-[var(--text-tertiary)] mb-1">类型</div>
        <div className="text-[13px] text-[var(--text-secondary)]">{entity.type}</div>
      </div>
      <div>
        <div className="text-[11px] text-[var(--text-tertiary)] mb-1">名称</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-8 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
          spellCheck={false}
        />
      </div>
      <div>
        <div className="text-[11px] text-[var(--text-tertiary)] mb-1">描述</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-h-[88px] px-2 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
          spellCheck={false}
        />
      </div>

      {error && <div className="text-[12px] text-red-400">{error}</div>}

      <button
        type="button"
        onClick={() => submitSave().catch(() => undefined)}
        className="w-full h-8 px-2 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[12px] text-white transition-colors disabled:opacity-60"
        disabled={!canSave || isLoading}
      >
        保存
      </button>
      <button
        type="button"
        onClick={() => onDelete(entity.id).catch(() => undefined)}
        className="w-full h-8 px-2 rounded-md bg-red-500/80 hover:bg-red-500 text-[12px] text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        disabled={isLoading}
      >
        <Trash2 className="w-4 h-4" />
        删除
      </button>
    </div>
  );
}

