import React, { useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

import { useAiStore } from '../stores/aiStore';
import { useEditorStore } from '../stores/editorStore';
import { DiffView } from './AI/DiffView';
import { SkillList } from './AI/SkillList';
import { VersionHistory } from './AI/VersionHistory';

import type { AiStreamEvent } from '../types/ai';

const AI_STREAM_EVENT_NAME = 'ai:skill:stream';

function isAiStreamEvent(value: unknown): value is AiStreamEvent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  const type = obj.type;
  const runId = obj.runId;
  if (typeof type !== 'string' || typeof runId !== 'string') return false;
  if (type === 'delta') return typeof obj.text === 'string';
  if (type === 'done') {
    const result = obj.result;
    if (!result || typeof result !== 'object') return false;
    const r = result as Record<string, unknown>;
    return typeof r.text === 'string';
  }
  if (type === 'error') {
    const error = obj.error;
    if (!error || typeof error !== 'object') return false;
    const e = error as Record<string, unknown>;
    return typeof e.code === 'string' && typeof e.message === 'string';
  }
  return false;
}

export function AIPanel() {
  const activeTab = useEditorStore((s) => (s.activeTabId ? s.tabStateById[s.activeTabId] ?? null : null));
  const currentPath = activeTab?.path ?? null;
  const editorContent = activeTab?.content ?? '';

  const run = useAiStore((s) => s.run);
  const historyPreview = useAiStore((s) => s.historyPreview);
  const versions = useAiStore((s) => s.versions);
  const versionsLoading = useAiStore((s) => s.versionsLoading);
  const versionsError = useAiStore((s) => s.versionsError);

  const runSkill = useAiStore((s) => s.runSkill);
  const cancelRun = useAiStore((s) => s.cancelRun);
  const acceptSuggestion = useAiStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useAiStore((s) => s.rejectSuggestion);
  const loadVersions = useAiStore((s) => s.loadVersions);
  const previewSnapshot = useAiStore((s) => s.previewSnapshot);
  const clearPreview = useAiStore((s) => s.clearPreview);
  const restorePreviewed = useAiStore((s) => s.restorePreviewed);
  const handleStreamEvent = useAiStore((s) => s.handleStreamEvent);

  const [showSkills, setShowSkills] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(true);

  useEffect(() => {
    if (!currentPath) return;
    loadVersions(currentPath).catch(() => undefined);
  }, [currentPath, loadVersions]);

  useEffect(() => {
    const api = window.writenow;
    const handler = (value: unknown) => {
      if (!isAiStreamEvent(value)) return;
      handleStreamEvent(value);
    };

    try {
      api?.on?.(AI_STREAM_EVENT_NAME, handler);
    } catch {
      // ignore
    }

    return () => {
      try {
        api?.off?.(AI_STREAM_EVENT_NAME, handler);
      } catch {
        // ignore
      }
    };
  }, [handleStreamEvent]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (run?.status !== 'streaming') return;
      cancelRun().catch(() => undefined);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelRun, run?.status]);

  const canRun = Boolean(currentPath) && run?.status !== 'streaming' && !historyPreview;

  return (
    <div className="w-full bg-[var(--bg-secondary)] flex flex-col h-full">
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] flex-shrink-0">
        <span className="text-[13px] text-[var(--text-primary)] font-medium">AI</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {!currentPath && <div className="text-[12px] text-[var(--text-tertiary)]">请选择一个文档后再使用 AI。</div>}

        {historyPreview && (
          <DiffView
            title={historyPreview.title}
            originalText={editorContent}
            suggestedText={historyPreview.snapshotContent}
            status="done"
            onAccept={() => restorePreviewed().catch(() => undefined)}
            onReject={clearPreview}
            acceptLabel="回退到此版本"
            rejectLabel="取消"
          />
        )}

        {run && (
          <>
            <DiffView
              title={run.skillName}
              originalText={run.originalText}
              suggestedText={run.suggestedText}
              status={run.status}
              contextDebug={run.contextDebug ?? undefined}
              sentPrompt={run.sentPrompt}
              errorMessage={run.errorMessage}
              violations={run.judge.result?.violations ?? []}
              violationStatus={run.judge.status}
              violationErrorMessage={run.judge.errorMessage}
              onCancel={() => cancelRun().catch(() => undefined)}
              onAccept={() => acceptSuggestion().catch(() => undefined)}
              onReject={() => rejectSuggestion().catch(() => undefined)}
              acceptLabel="接受并应用"
              rejectLabel="拒绝"
            />

            {run.injectedMemory.length > 0 && (
              <div
                data-testid="ai-injected-memory"
                className="wn-elevated rounded-md border border-[var(--border-subtle)] px-3 py-2"
              >
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
                  Injected Memory
                </div>
                <div className="space-y-1">
                  {run.injectedMemory.map((item) => (
                    <div key={item.id} className="text-[12px] text-[var(--text-secondary)] break-words">
                      <span className="text-[11px] text-[var(--text-tertiary)] mr-2">
                        {item.type}/{item.projectId ? 'project' : 'global'}/{item.origin}
                      </span>
                      {item.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSkills(!showSkills)}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">SKILL</span>
            </div>
            {showSkills ? (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </button>

          {showSkills && (
            <div className="p-2">
              <SkillList canRun={canRun} onRun={runSkill} />
            </div>
          )}
        </div>

        <div className="border border-[var(--border-subtle)] rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">HISTORY</span>
            </div>
            {showHistory ? (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </button>

          {showHistory && currentPath && (
            <div className="p-2">
              <VersionHistory
                items={versions}
                isLoading={versionsLoading}
                errorMessage={versionsError}
                onRefresh={() => loadVersions(currentPath).catch(() => undefined)}
                onPreview={(snapshotId) => previewSnapshot(snapshotId).catch(() => undefined)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
