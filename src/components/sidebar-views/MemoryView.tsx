import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trash2, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useProjectsStore } from '../../stores/projectsStore';
import { useMemoryStore } from '../../stores/memoryStore';

import type { UserMemory, UserMemoryType } from '../../types/ipc';

function formatScope(item: UserMemory): 'global' | 'project' {
  return item.projectId ? 'project' : 'global';
}

function formatTypeLabel(type: UserMemoryType, t: (key: string) => string): string {
  const key = `memory.type.${type}`;
  const translated = t(key);
  return translated !== key ? translated : type;
}

function formatOriginLabel(origin: UserMemory['origin'], t: (key: string) => string): string {
  const key = `memory.origin.${origin}`;
  const translated = t(key);
  return translated !== key ? translated : origin;
}

export function MemoryView() {
  const { t } = useTranslation();
  const projectId = useProjectsStore((s) => s.currentProjectId);

  const items = useMemoryStore((s) => s.items);
  const injectedPreview = useMemoryStore((s) => s.injectedPreview);
  const settings = useMemoryStore((s) => s.settings);
  const filter = useMemoryStore((s) => s.filter);
  const isLoading = useMemoryStore((s) => s.isLoading);
  const hasLoaded = useMemoryStore((s) => s.hasLoaded);
  const error = useMemoryStore((s) => s.error);

  const refresh = useMemoryStore((s) => s.refresh);
  const updateFilter = useMemoryStore((s) => s.updateFilter);
  const createMemory = useMemoryStore((s) => s.createMemory);
  const updateMemory = useMemoryStore((s) => s.updateMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const updateSettings = useMemoryStore((s) => s.updateSettings);
  const clearLearnedPreferences = useMemoryStore((s) => s.clearLearnedPreferences);
  const refreshInjectionPreview = useMemoryStore((s) => s.refreshInjectionPreview);

  const [createType, setCreateType] = useState<UserMemoryType>('preference');
  const [createScope, setCreateScope] = useState<'global' | 'project'>('global');
  const [createContent, setCreateContent] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<UserMemoryType>('preference');
  const [editScope, setEditScope] = useState<'global' | 'project'>('global');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (hasLoaded) return;
    refresh().catch(() => undefined);
  }, [hasLoaded, refresh]);

  useEffect(() => {
    if (!hasLoaded) return;
    refresh().catch(() => undefined);
  }, [hasLoaded, projectId, refresh]);

  useEffect(() => {
    if (!hasLoaded) return;
    refresh().catch(() => undefined);
  }, [filter.includeLearned, filter.scope, filter.type, hasLoaded, refresh]);

  const grouped = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const manual = list.filter((i) => i.origin === 'manual');
    const learned = list.filter((i) => i.origin === 'learned');
    return { manual, learned };
  }, [items]);

  const startEdit = (item: UserMemory) => {
    setEditId(item.id);
    setEditType(item.type);
    setEditScope(formatScope(item));
    setEditContent(item.content);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditType('preference');
    setEditScope('global');
    setEditContent('');
  };

  const submitCreate = async () => {
    const content = createContent.trim();
    if (!content) return;
    const created = await createMemory({ type: createType, scope: createScope, content });
    if (!created) return;
    setCreateContent('');
  };

  const submitEdit = async () => {
    if (!editId) return;
    const content = editContent.trim();
    if (!content) return;
    const updated = await updateMemory({ id: editId, type: editType, scope: editScope, content });
    if (!updated) return;
    cancelEdit();
  };

  const renderItem = (item: UserMemory) => {
    const isEditing = editId === item.id;
    const scope = formatScope(item);
    const typeLabel = formatTypeLabel(item.type, t);
    const originLabel = formatOriginLabel(item.origin, t);

    return (
      <div key={item.id} className="wn-elevated rounded-md p-3 border border-[var(--border-subtle)]" data-testid="memory-item">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {typeLabel}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
              {t(`memory.scope.${scope}`)}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${
                item.origin === 'learned'
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
              }`}
            >
              {originLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing && (
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] transition-colors"
              >
                {t('memory.actions.edit')}
              </button>
            )}
            <button
              type="button"
              onClick={() => deleteMemory(item.id).catch(() => undefined)}
              className="h-7 w-7 flex items-center justify-center rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
              title={t('memory.actions.delete')}
              data-testid="memory-delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isEditing && (
          <div className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {item.content}
          </div>
        )}

        {isEditing && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-[var(--text-tertiary)]">
                {t('memory.fields.type')}
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as UserMemoryType)}
                  className="mt-1 w-full h-8 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="preference">{formatTypeLabel('preference', t)}</option>
                  <option value="style">{formatTypeLabel('style', t)}</option>
                  <option value="feedback">{formatTypeLabel('feedback', t)}</option>
                </select>
              </label>
              <label className="text-[11px] text-[var(--text-tertiary)]">
                {t('memory.fields.scope')}
                <select
                  value={editScope}
                  onChange={(e) => setEditScope(e.target.value as 'global' | 'project')}
                  className="mt-1 w-full h-8 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="global">{t('memory.scope.global')}</option>
                  <option value="project" disabled={!projectId}>
                    {t('memory.scope.project')}
                  </option>
                </select>
              </label>
            </div>

            <label className="text-[11px] text-[var(--text-tertiary)]">
              {t('memory.fields.content')}
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mt-1 w-full min-h-20 p-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)] resize-y"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => submitEdit().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[12px] text-white transition-colors"
              >
                {t('memory.actions.save')}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[12px] text-[var(--text-secondary)] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const injectionHint = settings?.injectionEnabled
    ? settings?.privacyModeEnabled
      ? t('memory.injection.privacyHint')
      : t('memory.injection.enabledHint')
    : t('memory.injection.disabledHint');

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">
          {t('memory.title')}
        </span>
        <button
          type="button"
          onClick={() => refresh().catch(() => undefined)}
          className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors flex items-center gap-1.5 disabled:opacity-60"
          disabled={isLoading}
          data-testid="memory-refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4" data-testid="memory-view">
        {error && <div className="text-[12px] text-red-400">{error}</div>}

        <div className="wn-elevated rounded-md p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] text-[var(--text-secondary)]">{t('memory.settings.title')}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={settings?.injectionEnabled ?? true}
                onChange={(e) => updateSettings({ injectionEnabled: e.target.checked }).catch(() => undefined)}
              />
              {t('memory.settings.injectionEnabled')}
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={settings?.preferenceLearningEnabled ?? true}
                onChange={(e) => updateSettings({ preferenceLearningEnabled: e.target.checked }).catch(() => undefined)}
              />
              {t('memory.settings.learningEnabled')}
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={settings?.privacyModeEnabled ?? false}
                onChange={(e) => updateSettings({ privacyModeEnabled: e.target.checked }).catch(() => undefined)}
              />
              {t('memory.settings.privacyMode')}
            </label>
            <label className="text-[12px] text-[var(--text-secondary)]">
              {t('memory.settings.threshold')}
              <input
                type="number"
                min={1}
                max={20}
                value={settings?.preferenceLearningThreshold ?? 3}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(20, Number.parseInt(e.target.value || '0', 10) || 1));
                  updateSettings({ preferenceLearningThreshold: value }).catch(() => undefined);
                }}
                className="mt-1 w-full h-8 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-[var(--text-tertiary)]">{injectionHint}</div>
            <button
              type="button"
              onClick={() => clearLearnedPreferences().catch(() => undefined)}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] transition-colors"
            >
              {t('memory.actions.clearLearned')}
            </button>
          </div>
        </div>

        <div className="wn-elevated rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] text-[var(--text-secondary)]">{t('memory.injection.title')}</div>
            <button
              type="button"
              onClick={() => refreshInjectionPreview().catch(() => undefined)}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] transition-colors flex items-center gap-1.5"
              data-testid="memory-injection-refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('common.refresh')}
            </button>
          </div>

          <div data-testid="memory-injection-preview">
            {injectedPreview.length === 0 ? (
              <div className="text-[12px] text-[var(--text-tertiary)]">{t('memory.injection.empty')}</div>
            ) : (
              <div className="space-y-2">
                {injectedPreview.map((item) => (
                  <div key={item.id} className="text-[12px] text-[var(--text-secondary)] flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-[var(--accent-primary)]" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-[var(--text-tertiary)]">
                        {formatTypeLabel(item.type, t)} · {t(`memory.scope.${formatScope(item)}`)} · {formatOriginLabel(item.origin, t)}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{item.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="wn-elevated rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[12px] text-[var(--text-secondary)]">{t('memory.create.title')}</div>
            <button
              type="button"
              onClick={() => submitCreate().catch(() => undefined)}
              className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[11px] text-white transition-colors flex items-center gap-1.5 disabled:opacity-60"
              disabled={isLoading || !createContent.trim()}
              data-testid="memory-create-submit"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('common.create')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[var(--text-tertiary)]">
              {t('memory.fields.type')}
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as UserMemoryType)}
                className="mt-1 w-full h-8 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
                data-testid="memory-create-type"
              >
                <option value="preference">{formatTypeLabel('preference', t)}</option>
                <option value="style">{formatTypeLabel('style', t)}</option>
                <option value="feedback">{formatTypeLabel('feedback', t)}</option>
              </select>
            </label>
            <label className="text-[11px] text-[var(--text-tertiary)]">
              {t('memory.fields.scope')}
              <select
                value={createScope}
                onChange={(e) => setCreateScope(e.target.value as 'global' | 'project')}
                className="mt-1 w-full h-8 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
                data-testid="memory-create-scope"
              >
                <option value="global">{t('memory.scope.global')}</option>
                <option value="project" disabled={!projectId}>
                  {t('memory.scope.project')}
                </option>
              </select>
            </label>
          </div>

          <label className="text-[11px] text-[var(--text-tertiary)]">
            {t('memory.fields.content')}
            <textarea
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              className="mt-1 w-full min-h-20 p-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)] resize-y"
              placeholder={t('memory.create.placeholder')}
              data-testid="memory-create-content"
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">{t('memory.list.title')}</div>
            <div className="flex items-center gap-2">
              <select
                value={filter.scope}
                onChange={(e) => updateFilter({ scope: e.target.value as 'all' | 'global' | 'project' })}
                className="h-7 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[11px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="all">{t('memory.scope.all')}</option>
                <option value="global">{t('memory.scope.global')}</option>
                <option value="project" disabled={!projectId}>
                  {t('memory.scope.project')}
                </option>
              </select>
              <select
                value={filter.type}
                onChange={(e) => updateFilter({ type: e.target.value as UserMemoryType | 'all' })}
                className="h-7 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[11px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="all">{t('memory.type.all')}</option>
                <option value="preference">{formatTypeLabel('preference', t)}</option>
                <option value="style">{formatTypeLabel('style', t)}</option>
                <option value="feedback">{formatTypeLabel('feedback', t)}</option>
              </select>
              <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={filter.includeLearned}
                  onChange={(e) => updateFilter({ includeLearned: e.target.checked })}
                />
                {t('memory.filters.includeLearned')}
              </label>
              <button
                type="button"
                onClick={() => refresh().catch(() => undefined)}
                className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] transition-colors"
              >
                {t('common.refresh')}
              </button>
            </div>
          </div>

          {grouped.manual.length === 0 && grouped.learned.length === 0 && (
            <div className="text-[12px] text-[var(--text-tertiary)]">{t('memory.list.empty')}</div>
          )}

          {grouped.manual.map(renderItem)}

          {grouped.learned.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {t('memory.list.learned')}
              </div>
              <div className="space-y-3">{grouped.learned.map(renderItem)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
