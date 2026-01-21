import React, { useEffect, useMemo } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

import { BUILTIN_SKILLS } from '../lib/skills';
import { useAiStore } from '../stores/aiStore';
import { useEditorStore } from '../stores/editorStore';
import { DiffView } from './AI/DiffView';
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
  const currentPath = useEditorStore((s) => s.currentPath);
  const editorContent = useEditorStore((s) => s.content);

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

  const skillButtons = useMemo(() => {
    return BUILTIN_SKILLS.map((skill) => (
      <button
        key={skill.id}
        onClick={() => runSkill({ id: skill.id, name: skill.name }).catch(() => undefined)}
        disabled={!canRun}
        data-testid={`ai-skill-${skill.id}`}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left group disabled:opacity-50 disabled:pointer-events-none"
        title={skill.description}
      >
        <div className="w-7 h-7 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] text-[var(--text-secondary)] leading-tight">{skill.name}</div>
          <div className="text-xs text-[var(--text-tertiary)] truncate">{skill.description}</div>
        </div>
      </button>
    ));
  }, [canRun, runSkill]);

  return (
    <div className="w-[340px] bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] flex flex-col h-full">
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
          <DiffView
            title={run.skillName}
            originalText={run.originalText}
            suggestedText={run.suggestedText}
            status={run.status}
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

          {showSkills && <div className="p-2 flex flex-col gap-1">{skillButtons}</div>}
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
