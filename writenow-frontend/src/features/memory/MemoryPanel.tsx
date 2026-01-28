/**
 * MemoryPanel - Memory management CRUD UI
 * Why: Allow users to view, create, edit, and delete memory entries (preference/feedback/style).
 */

import { useCallback, useState } from 'react';
import { Plus, Trash2, Edit3, Brain, RefreshCw, AlertCircle } from 'lucide-react';

import { SidebarPanelSection } from '@/components/layout/sidebar-panel';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Textarea } from '@/components/ui/textarea';
import type { UserMemory, UserMemoryType } from '@/types/ipc-generated';

import { useMemory } from './useMemory';

const MEMORY_TYPE_LABELS: Record<UserMemoryType, string> = {
  preference: '偏好',
  feedback: '反馈',
  style: '风格',
};

const MEMORY_TYPE_OPTIONS: { value: UserMemoryType; label: string }[] = [
  { value: 'preference', label: '偏好' },
  { value: 'feedback', label: '反馈' },
  { value: 'style', label: '风格' },
];

interface MemoryItemProps {
  memory: UserMemory;
  onEdit: (memory: UserMemory) => void;
  onDelete: (id: string) => void;
}

function MemoryItem({ memory, onEdit, onDelete }: MemoryItemProps) {
  const isLearned = memory.origin === 'learned';
  const createdAt = new Date(memory.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group px-3 py-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--fg-muted)] font-medium">
              {MEMORY_TYPE_LABELS[memory.type]}
            </span>
            {isLearned && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-default)]/10 text-[var(--accent-default)] font-medium">
                自动学习
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-[var(--fg-default)] line-clamp-3 break-words">
            {memory.content}
          </p>
          <div className="mt-1 text-[10px] text-[var(--fg-subtle)]">{createdAt}</div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            icon={Edit3}
            size="xs"
            variant="ghost"
            tooltip="编辑"
            onClick={() => onEdit(memory)}
          />
          <IconButton
            icon={Trash2}
            size="xs"
            variant="ghost"
            tooltip="删除"
            onClick={() => onDelete(memory.id)}
          />
        </div>
      </div>
    </div>
  );
}

interface MemoryFormProps {
  initial?: UserMemory | null;
  onSubmit: (type: UserMemoryType, content: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function MemoryForm({ initial, onSubmit, onCancel, loading }: MemoryFormProps) {
  const [type, setType] = useState<UserMemoryType>(initial?.type ?? 'preference');
  const [content, setContent] = useState(initial?.content ?? '');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;
      await onSubmit(type, content.trim());
    },
    [type, content, onSubmit],
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="p-3 space-y-3 border-b border-[var(--border-subtle)]">
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--fg-muted)]">类型</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as UserMemoryType)}
          className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] text-[12px] px-2"
        >
          {MEMORY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-[var(--fg-muted)]">内容</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入记忆内容…"
          className="min-h-[72px] text-[12px]"
          autoFocus
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={loading} disabled={!content.trim()}>
          {initial ? '保存' : '创建'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          取消
        </Button>
      </div>
    </form>
  );
}

export function MemoryPanel() {
  const memory = useMemory();

  const [showForm, setShowForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<UserMemory | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (type: UserMemoryType, content: string) => {
      setFormLoading(true);
      const result = await memory.create(type, content);
      setFormLoading(false);
      if (result) {
        setShowForm(false);
      }
    },
    [memory],
  );

  const handleEdit = useCallback(
    async (type: UserMemoryType, content: string) => {
      if (!editingMemory) return;
      setFormLoading(true);
      const result = await memory.update(editingMemory.id, { type, content });
      setFormLoading(false);
      if (result) {
        setEditingMemory(null);
      }
    },
    [editingMemory, memory],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (deleteConfirmId !== id) {
        setDeleteConfirmId(id);
        return;
      }
      await memory.remove(id);
      setDeleteConfirmId(null);
    },
    [deleteConfirmId, memory],
  );

  const handleClearLearned = useCallback(async () => {
    const confirmed = window.confirm('确定要清除所有自动学习的记忆吗？手动创建的记忆不会被删除。');
    if (!confirmed) return;
    await memory.clearLearned();
  }, [memory]);

  const manualMemories = memory.memories.filter((m) => m.origin === 'manual');
  const learnedMemories = memory.memories.filter((m) => m.origin === 'learned');

  const injectionDisabled = memory.settings && !memory.settings.injectionEnabled;

  return (
    <div className="h-full flex flex-col">
      {/* Header Actions */}
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[var(--accent-default)]" />
          <span className="text-[11px] font-medium text-[var(--fg-default)]">
            {memory.memories.length} 条记忆
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={RefreshCw}
            size="xs"
            variant="ghost"
            tooltip="刷新"
            onClick={() => void memory.refresh()}
            disabled={memory.loading}
          />
          <IconButton
            icon={Plus}
            size="xs"
            variant="ghost"
            tooltip="新建记忆"
            onClick={() => setShowForm(true)}
            disabled={showForm || !!editingMemory}
          />
        </div>
      </div>

      {/* Injection Disabled Warning */}
      {injectionDisabled && (
        <div className="px-3 py-2 bg-[var(--warning)]/10 border-b border-[var(--warning)]/30 flex items-start gap-2">
          <AlertCircle size={14} className="text-[var(--warning)] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[var(--warning)]">
            记忆注入已关闭。记忆将被保存但不会被注入到 AI 上下文中。
            <button
              className="underline ml-1"
              onClick={() => void memory.updateSettings({ injectionEnabled: true })}
            >
              启用
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <MemoryForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={formLoading} />
      )}

      {/* Edit Form */}
      {editingMemory && (
        <MemoryForm
          initial={editingMemory}
          onSubmit={handleEdit}
          onCancel={() => setEditingMemory(null)}
          loading={formLoading}
        />
      )}

      {/* Error Display */}
      {memory.error && (
        <div className="px-3 py-2 text-[11px] text-[var(--error)] border-b border-[var(--error)]/40 bg-[var(--error)]/5">
          {memory.error}
        </div>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {memory.loading && memory.memories.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--fg-muted)]">正在加载…</div>
        ) : memory.memories.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-[var(--fg-muted)]">
            暂无记忆。点击「+」创建第一条记忆。
          </div>
        ) : (
          <>
            {manualMemories.length > 0 && (
              <SidebarPanelSection title="手动创建">
                <div className="space-y-1">
                  {manualMemories.map((m) => (
                    <MemoryItem
                      key={m.id}
                      memory={m}
                      onEdit={setEditingMemory}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SidebarPanelSection>
            )}

            {learnedMemories.length > 0 && (
              <SidebarPanelSection title="自动学习" defaultCollapsed={learnedMemories.length > 5}>
                <div className="space-y-1">
                  {learnedMemories.map((m) => (
                    <MemoryItem
                      key={m.id}
                      memory={m}
                      onEdit={setEditingMemory}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
                {learnedMemories.length > 0 && (
                  <div className="px-3 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => void handleClearLearned()}>
                      清除所有自动学习
                    </Button>
                  </div>
                )}
              </SidebarPanelSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MemoryPanel;
