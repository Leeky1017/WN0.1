import React, { useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useOutlineStore } from '../../stores/outlineStore';
import { useEditorStore } from '../../stores/editorStore';

import type { OutlineNode } from '../../types/ipc';

interface OutlinePanelProps {
  articleId: string | null;
  editorContent: string;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deriveOutlineFromMarkdown(content: string): OutlineNode[] {
  if (!content) return [];
  const lines = content.split('\n');
  const nodes: OutlineNode[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (!mdMatch) continue;
    const level = mdMatch[1].length;
    const title = mdMatch[2].trim();
    if (!title) continue;
    nodes.push({
      id: crypto.randomUUID(),
      title,
      level,
    });
  }
  return nodes;
}

function subtreeRange(nodes: OutlineNode[], startIndex: number) {
  const baseLevel = nodes[startIndex]?.level ?? 1;
  let end = startIndex + 1;
  while (end < nodes.length) {
    const next = nodes[end];
    if (!next || next.level <= baseLevel) break;
    end += 1;
  }
  return { start: startIndex, end };
}

function findPrevSibling(nodes: OutlineNode[], startIndex: number) {
  const level = nodes[startIndex]?.level ?? 1;
  for (let i = startIndex - 1; i >= 0; i -= 1) {
    const node = nodes[i];
    if (!node) continue;
    if (node.level === level) return i;
    if (node.level < level) return null;
  }
  return null;
}

function findNextSibling(nodes: OutlineNode[], endIndex: number, level: number) {
  for (let i = endIndex; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!node) continue;
    if (node.level === level) return i;
    if (node.level < level) return null;
  }
  return null;
}

function moveSubtreeUp(nodes: OutlineNode[], startIndex: number) {
  const currentRange = subtreeRange(nodes, startIndex);
  const prevStart = findPrevSibling(nodes, currentRange.start);
  if (prevStart === null) return nodes;
  const prevRange = subtreeRange(nodes, prevStart);

  const before = nodes.slice(0, prevRange.start);
  const prev = nodes.slice(prevRange.start, prevRange.end);
  const curr = nodes.slice(currentRange.start, currentRange.end);
  const after = nodes.slice(currentRange.end);

  return [...before, ...curr, ...prev, ...after];
}

function moveSubtreeDown(nodes: OutlineNode[], startIndex: number) {
  const currentRange = subtreeRange(nodes, startIndex);
  const level = nodes[startIndex]?.level ?? 1;
  const nextStart = findNextSibling(nodes, currentRange.end, level);
  if (nextStart === null) return nodes;
  const nextRange = subtreeRange(nodes, nextStart);

  const before = nodes.slice(0, currentRange.start);
  const curr = nodes.slice(currentRange.start, currentRange.end);
  const next = nodes.slice(nextRange.start, nextRange.end);
  const after = nodes.slice(nextRange.end);

  return [...before, ...next, ...curr, ...after];
}

function removeSubtree(nodes: OutlineNode[], startIndex: number) {
  const range = subtreeRange(nodes, startIndex);
  return [...nodes.slice(0, range.start), ...nodes.slice(range.end)];
}

function findHeadingLine(editorContent: string, node: OutlineNode) {
  const title = node.title.trim();
  if (!title) return null;
  const lines = editorContent.split('\n');
  const exactPrefix = '#'.repeat(Math.min(6, Math.max(1, Math.floor(node.level))));
  const exact = new RegExp(`^${escapeRegExp(exactPrefix)}\\s+${escapeRegExp(title)}\\s*$`);
  for (let i = 0; i < lines.length; i += 1) {
    if (exact.test(lines[i])) return i + 1;
  }
  const anyHeading = new RegExp(`^#{1,6}\\s+${escapeRegExp(title)}\\s*$`);
  for (let i = 0; i < lines.length; i += 1) {
    if (anyHeading.test(lines[i])) return i + 1;
  }
  return null;
}

export function OutlinePanel({ articleId, editorContent }: OutlinePanelProps) {
  const { t, i18n } = useTranslation();
  const outline = useOutlineStore((s) => s.outline);
  const isLoading = useOutlineStore((s) => s.isLoading);
  const isDirty = useOutlineStore((s) => s.isDirty);
  const loadError = useOutlineStore((s) => s.error);
  const saveStatus = useOutlineStore((s) => s.saveStatus);
  const lastSavedAt = useOutlineStore((s) => s.lastSavedAt);
  const loadOutline = useOutlineStore((s) => s.loadOutline);
  const setOutline = useOutlineStore((s) => s.setOutline);
  const saveOutline = useOutlineStore((s) => s.saveOutline);
  const clear = useOutlineStore((s) => s.clear);
  const editorContentRef = useRef(editorContent);

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    const nextId = typeof articleId === 'string' ? articleId.trim() : '';
    if (!nextId) {
      clear();
      return;
    }
    const fallback = deriveOutlineFromMarkdown(editorContentRef.current);
    loadOutline(nextId, fallback).catch(() => undefined);
  }, [articleId, clear, loadOutline]);

  const canSave = Boolean(articleId) && outline.length > 0 && !isLoading;

  const updateNode = (id: string, patch: Partial<OutlineNode>) => {
    setOutline(outline.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const addNode = () => {
    const level = outline.length > 0 ? outline[outline.length - 1].level : 1;
    setOutline([
      ...outline,
      {
        id: crypto.randomUUID(),
        title: t('outline.node.defaultTitle'),
        level,
      },
    ]);
  };

  const onMoveUp = (index: number) => {
    setOutline(moveSubtreeUp(outline, index));
  };

  const onMoveDown = (index: number) => {
    setOutline(moveSubtreeDown(outline, index));
  };

  const onDelete = (index: number) => {
    setOutline(removeSubtree(outline, index));
  };

  const onJump = (node: OutlineNode) => {
    const line = findHeadingLine(editorContent, node) ?? 1;
    useEditorStore.getState().requestJumpToLine(line);
  };

  const save = async () => {
    if (!articleId) return;
    await saveOutline(articleId, outline);
  };

  const saveLabel = useMemo(() => {
    if (saveStatus === 'saving') return t('editor.save.saving');
    if (saveStatus === 'error') return t('editor.save.error');
    if (isDirty) return t('editor.save.unsaved');
    return t('editor.save.saved');
  }, [isDirty, saveStatus, t]);

  if (!articleId) {
    return (
      <>
        <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
          <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('outline.title')}</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-[13px] text-[var(--text-tertiary)] mb-1">{t('outline.noFile.title')}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{t('outline.noFile.hint')}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('outline.title')}</span>
        <div className="flex items-center gap-1">
          <div className="text-[11px] text-[var(--text-tertiary)] mr-1">
            {saveLabel}
            {lastSavedAt && !isDirty
              ? ` · ${new Date(lastSavedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </div>
          <button
            type="button"
            onClick={addNode}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title={t('outline.actions.addNodeTitle')}
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            type="button"
            onClick={() => save().catch(() => undefined)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            title={t('outline.actions.saveOutlineTitle')}
            disabled={!canSave || saveStatus === 'saving'}
          >
            <Save className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loadError && (
          <div className="px-3 py-2 text-[12px] text-red-400">
            {loadError}
          </div>
        )}

        {outline.length === 0 && !isLoading && (
          <div className="px-3 py-6 text-center">
            <div className="text-[13px] text-[var(--text-tertiary)] mb-1">{t('outline.empty.title')}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{t('outline.empty.hint')}</div>
          </div>
        )}

        {outline.map((node, index) => (
          <div key={node.id} className="flex items-center gap-1 px-2 py-1">
            <button
              type="button"
              onClick={() => onJump(node)}
              data-testid={`outline-node-${index}`}
              className="flex-1 min-w-0 flex items-center gap-2 rounded hover:bg-[var(--bg-hover)] transition-colors px-2 py-1"
              style={{ paddingLeft: `${8 + (Math.max(1, node.level) - 1) * 12}px` }}
              title={t('outline.actions.jumpToEditorTitle')}
            >
              <span className="text-[11px] text-[var(--text-tertiary)]">{t('outline.node.headingLabel', { level: node.level })}</span>
              <input
                value={node.title}
                onChange={(e) => updateNode(node.id, { title: e.target.value })}
                data-testid={`outline-node-title-${index}`}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[var(--text-secondary)]"
                spellCheck={false}
              />
            </button>

            <button
              type="button"
              onClick={() => onMoveUp(index)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
              title={t('outline.actions.moveUpTitle')}
              disabled={index === 0}
            >
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
              title={t('outline.actions.moveDownTitle')}
              disabled={index === outline.length - 1}
            >
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
              title={t('common.delete')}
            >
              <Trash2 className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
