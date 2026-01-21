import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { fileOps } from '../../lib/ipc';
import { useFilesStore } from '../../stores/filesStore';
import { useProjectsStore } from '../../stores/projectsStore';
import { useCardViewStore, type CardStatus } from '../../stores/cardViewStore';
import { WnCard } from '../wn';

type WnCardViewProps = {
  selectedFile: string | null;
  onSelectFile: (file: string) => void | Promise<void>;
};

type DocMeta = {
  title: string;
  summary: string;
};

function stripFrontMatter(content: string) {
  const raw = typeof content === 'string' ? content : '';
  if (!raw.startsWith('---\n')) return raw;
  const endIndex = raw.indexOf('\n---', 4);
  if (endIndex === -1) return raw;
  return raw.slice(endIndex + '\n---'.length).replace(/^\n+/, '');
}

function extractTitleAndSummary(markdown: string, fallbackTitle: string): DocMeta {
  const body = stripFrontMatter(markdown);
  const lines = body.split('\n');

  let title = '';
  for (const line of lines.slice(0, 20)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith('#')) continue;
    title = trimmed.replace(/^#+\s*/, '').trim();
    if (title) break;
  }

  let summary = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    summary = trimmed;
    break;
  }

  const safeTitle = title || fallbackTitle;
  const safeSummary = summary.length > 140 ? `${summary.slice(0, 140)}…` : summary;
  return { title: safeTitle, summary: safeSummary };
}

function toDisplayName(fileName: string) {
  return fileName.replace(/\.md$/i, '');
}

export function WnCardView({ selectedFile, onSelectFile }: WnCardViewProps) {
  const { t } = useTranslation();
  const projectId = useProjectsStore((s) => s.currentProjectId);
  const hydrateCards = useCardViewStore((s) => s.hydrate);
  const cardsHydrated = useCardViewStore((s) => s.isHydrated);
  const cardState = useCardViewStore((s) => s.getProjectState(projectId));
  const syncOrder = useCardViewStore((s) => s.syncOrder);
  const moveCard = useCardViewStore((s) => s.moveCard);
  const setStatus = useCardViewStore((s) => s.setStatus);
  const setScrollTop = useCardViewStore((s) => s.setScrollTop);

  const files = useFilesStore((s) => s.files);
  const isLoading = useFilesStore((s) => s.isLoading);
  const error = useFilesStore((s) => s.error);
  const refreshFiles = useFilesStore((s) => s.refresh);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [metaById, setMetaById] = useState<Record<string, DocMeta>>({});
  const loadingMetaRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!cardsHydrated) hydrateCards();
  }, [cardsHydrated, hydrateCards]);

  useEffect(() => {
    refreshFiles().catch(() => undefined);
  }, [refreshFiles]);

  const fileIds = useMemo(() => files.map((f) => f.path), [files]);

  useEffect(() => {
    if (!cardsHydrated) return;
    syncOrder(projectId, fileIds);
  }, [cardsHydrated, fileIds, projectId, syncOrder]);

  const orderedFiles = useMemo(() => {
    const byId = new Map(files.map((f) => [f.path, f]));
    const orderedIds = cardState.order.filter((id) => byId.has(id));
    const missing = files.map((f) => f.path).filter((id) => !orderedIds.includes(id));
    return [...orderedIds, ...missing].map((id) => byId.get(id)!).filter(Boolean);
  }, [cardState.order, files]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = useCardViewStore.getState().getProjectState(projectId).scrollTop;
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const pending = orderedFiles.slice(0, 40).filter((f) => !metaById[f.path] && !loadingMetaRef.current.has(f.path));
    if (pending.length === 0) return;

    const queue = pending.map((f) => f.path);
    for (const id of queue) loadingMetaRef.current.add(id);

    const run = async () => {
      const concurrency = 4;
      const workers = Array.from({ length: concurrency }, async () => {
        while (!cancelled && queue.length > 0) {
          const nextId = queue.shift();
          if (!nextId) break;
          try {
            const res = await fileOps.read(nextId);
            if (cancelled) break;
            const fallbackTitle = toDisplayName(nextId);
            const meta = extractTitleAndSummary(res.content ?? '', fallbackTitle);
            setMetaById((prev) => ({ ...prev, [nextId]: meta }));
          } catch {
            if (cancelled) break;
            const fallbackTitle = toDisplayName(nextId);
            setMetaById((prev) => ({ ...prev, [nextId]: { title: fallbackTitle, summary: '' } }));
          } finally {
            loadingMetaRef.current.delete(nextId);
          }
        }
      });
      await Promise.all(workers);
    };

    run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [metaById, orderedFiles]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const next = e.currentTarget.scrollTop;
    if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
    scrollSaveTimerRef.current = window.setTimeout(() => setScrollTop(projectId, next), 200);
  };

  useEffect(() => {
    return () => {
      if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = null;
    };
  }, []);

  const getStatus = (id: string): CardStatus => {
    const value = cardState.statusById[id];
    return value ?? 'draft';
  };

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('cards.title')}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3" onScroll={onScroll} data-testid="cards-scroll">
        {error && (
          <div className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
            <div className="mb-2">{t('cards.loadFailed', { error })}</div>
            <button
              type="button"
              onClick={() => refreshFiles().catch(() => undefined)}
              className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {!error && isLoading && files.length === 0 && (
          <div className="text-[12px] text-[var(--text-tertiary)] py-6 text-center">{t('common.loading')}</div>
        )}

        {!error && !isLoading && files.length === 0 && (
          <div className="text-[12px] text-[var(--text-tertiary)] py-6 text-center">{t('cards.empty')}</div>
        )}

        {!error && orderedFiles.length > 0 && (
          <div className="flex flex-col gap-2" data-testid="cards-list">
            {orderedFiles.map((file) => {
              const docId = file.path;
              const isSelected = selectedFile === docId;
              const meta = metaById[docId];
              const title = meta?.title ?? toDisplayName(file.name);
              const summary = meta?.summary ?? '';
              const status = getStatus(docId);

              return (
                <div
                  key={docId}
                  data-testid={`card-${docId}`}
                  draggable
                  onDragStart={(e) => {
                    draggingIdRef.current = docId;
                    setDraggingId(docId);
                    e.dataTransfer.setData('text/plain', docId);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    draggingIdRef.current = null;
                    setDraggingId(null);
                  }}
                  onDragOver={(e) => {
                    const dragged = draggingIdRef.current ?? draggingId ?? e.dataTransfer.getData('text/plain');
                    if (!dragged || dragged === docId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragged = draggingIdRef.current ?? draggingId ?? e.dataTransfer.getData('text/plain');
                    if (!dragged || dragged === docId) return;
                    moveCard(projectId, dragged, docId);
                    draggingIdRef.current = null;
                    setDraggingId(null);
                  }}
                >
                  <WnCard isActive={isSelected} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 text-[var(--text-tertiary)]" title={t('cards.dragHandle')}>
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => onSelectFile(docId)}
                        title={title}
                      >
                        <div className="text-[13px] text-[var(--text-primary)] font-medium truncate">{title}</div>
                        {summary && (
                          <div className="mt-1 text-[12px] text-[var(--text-tertiary)] leading-snug">{summary}</div>
                        )}
                        {!summary && (
                          <div className="mt-1 text-[12px] text-[var(--text-tertiary)] leading-snug">
                            {t('cards.wordCount', { count: file.wordCount })}
                          </div>
                        )}
                      </button>
                      <select
                        data-testid={`card-status-${docId}`}
                        className="h-7 px-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
                        value={status}
                        onChange={(e) => setStatus(projectId, docId, e.target.value as CardStatus)}
                        title={t('cards.status.title')}
                      >
                        <option value="draft">{t('cards.status.draft')}</option>
                        <option value="review">{t('cards.status.review')}</option>
                        <option value="done">{t('cards.status.done')}</option>
                      </select>
                    </div>
                  </WnCard>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
