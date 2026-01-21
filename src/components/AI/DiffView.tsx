import React, { useMemo } from 'react';

import { diffChars } from '../../lib/textDiff';
import { ViolationMarker } from '../Diff/ViolationMarker';
import { ContextDebugPanel } from './ContextDebugPanel';

import type { ConstraintViolation } from '../../types/constraints';
import type { ContextDebugState } from '../../types/context-debug';

type DiffViewStatus = 'streaming' | 'done' | 'error' | 'canceled';

type DiffViolationStatus = 'idle' | 'checking' | 'done' | 'error';

type DiffViewProps = {
  title: string;
  originalText: string;
  suggestedText: string;
  status: DiffViewStatus;
  contextDebug?: ContextDebugState;
  errorMessage?: string | null;
  violations?: ConstraintViolation[];
  violationStatus?: DiffViolationStatus;
  violationErrorMessage?: string | null;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
  cancelLabel?: string;
};

type ViolationRange = {
  start: number;
  end: number;
  violation: ConstraintViolation;
};

function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeRanges(violations: ConstraintViolation[], textLength: number): ViolationRange[] {
  const ranges: ViolationRange[] = [];
  for (const violation of violations) {
    const pos = violation.position;
    if (!pos) continue;
    const start = clampRange(pos.start, 0, textLength);
    const end = clampRange(pos.end, 0, textLength);
    if (end <= start) continue;
    ranges.push({ start, end, violation });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  return ranges;
}

function renderWithViolations(text: string, baseOffset: number, ranges: ViolationRange[]): React.ReactNode[] {
  if (ranges.length === 0) return [text];

  const segmentStart = baseOffset;
  const segmentEnd = baseOffset + text.length;
  const overlapping = ranges.filter((r) => r.end > segmentStart && r.start < segmentEnd);
  if (overlapping.length === 0) return [text];

  const boundaries = new Set<number>([0, text.length]);
  for (const r of overlapping) {
    boundaries.add(clampRange(r.start - baseOffset, 0, text.length));
    boundaries.add(clampRange(r.end - baseOffset, 0, text.length));
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    const slice = text.slice(start, end);
    const absStart = baseOffset + start;
    const absEnd = baseOffset + end;
    const active = overlapping.filter((r) => r.start <= absStart && r.end >= absEnd).map((r) => r.violation);

    if (active.length === 0) {
      nodes.push(<span key={`${baseOffset}:${start}:${end}`}>{slice}</span>);
    } else {
      nodes.push(<ViolationMarker key={`${baseOffset}:${start}:${end}`} text={slice} violations={active} />);
    }
  }

  return nodes;
}

export function DiffView({
  title,
  originalText,
  suggestedText,
  status,
  contextDebug,
  errorMessage,
  violations = [],
  violationStatus = 'idle',
  violationErrorMessage,
  onAccept,
  onReject,
  onCancel,
  acceptLabel = '接受',
  rejectLabel = '拒绝',
  cancelLabel = '取消',
}: DiffViewProps) {
  const segments = useMemo(() => diffChars(originalText, suggestedText), [originalText, suggestedText]);
  const [ignoreWarnings, setIgnoreWarnings] = React.useState(false);

  const filteredViolations = useMemo(() => {
    if (!ignoreWarnings) return violations;
    return violations.filter((v) => v.level === 'error');
  }, [ignoreWarnings, violations]);

  const counts = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    for (const v of filteredViolations) {
      if (v.level === 'error') errors += 1;
      else if (v.level === 'warning') warnings += 1;
      else infos += 1;
    }
    return { errors, warnings, infos, total: filteredViolations.length };
  }, [filteredViolations]);

  const ranges = useMemo(() => normalizeRanges(filteredViolations, suggestedText.length), [filteredViolations, suggestedText.length]);

  const canCancel = status === 'streaming' && typeof onCancel === 'function';
  const canDecide = status === 'done' && typeof onAccept === 'function' && typeof onReject === 'function';

  const renderOriginal = () => (
    <pre
      data-testid="ai-diff-original"
      className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--text-secondary)] font-mono"
    >
      {segments.map((seg, idx) => {
        if (seg.op === 'insert') return null;
        const className =
          seg.op === 'delete'
            ? 'bg-red-500/15 text-red-200 line-through decoration-red-300/80'
            : 'text-[var(--text-secondary)]';
        return (
          <span key={idx} className={className}>
            {seg.text}
          </span>
        );
      })}
    </pre>
  );

  const renderSuggested = () => (
    <pre
      data-testid="ai-diff-suggested"
      className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--text-secondary)] font-mono"
    >
      {(() => {
        let offset = 0;
        return segments.map((seg, idx) => {
          if (seg.op === 'delete') return null;
          const className = seg.op === 'insert' ? 'bg-emerald-500/15 text-emerald-200' : 'text-[var(--text-secondary)]';
          const nodes = renderWithViolations(seg.text, offset, ranges);
          offset += seg.text.length;
          return (
            <span key={idx} className={className}>
              {nodes}
            </span>
          );
        });
      })()}
    </pre>
  );

  return (
    <div data-testid="ai-diff" className="wn-elevated rounded-md border border-[var(--border-subtle)] overflow-hidden">
      <div className="h-10 px-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="text-[12px] text-[var(--text-secondary)] font-medium truncate">{title}</div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              data-testid="ai-diff-cancel"
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          {canDecide && (
            <>
              <button
                type="button"
                onClick={onReject}
                data-testid="ai-diff-reject"
                className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
              >
                {rejectLabel}
              </button>
              <button
                type="button"
                onClick={onAccept}
                data-testid="ai-diff-accept"
                className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[12px] text-white transition-colors"
              >
                {acceptLabel}
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div
          data-testid="ai-diff-error"
          className={`px-3 py-2 border-b border-[var(--border-subtle)] text-[12px] ${
            status === 'error' ? 'text-red-300' : 'text-amber-300'
          }`}
        >
          {errorMessage}
        </div>
      )}

      {status === 'streaming' && (
        <div
          data-testid="ai-diff-streaming"
          className="px-3 py-2 border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]"
        >
          正在生成…（支持流式）
        </div>
      )}

      {status !== 'streaming' && violationStatus === 'checking' && (
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
          正在检查写作约束…
        </div>
      )}

      {status !== 'streaming' && violationStatus === 'error' && violationErrorMessage && (
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] text-[11px] text-red-300">
          约束检查失败：{violationErrorMessage}
        </div>
      )}

      {status !== 'streaming' && counts.total > 0 && (
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
          <div data-testid="ai-diff-violations" className="text-[11px] text-[var(--text-tertiary)]">
            {counts.errors > 0 ? `${counts.errors} 个错误` : ''}
            {counts.errors > 0 && (counts.warnings > 0 || counts.infos > 0) ? '，' : ''}
            {counts.warnings > 0 ? `${counts.warnings} 个警告` : ''}
            {counts.warnings > 0 && counts.infos > 0 ? '，' : ''}
            {counts.infos > 0 ? `${counts.infos} 个提示` : ''}
          </div>
          <button
            type="button"
            onClick={() => setIgnoreWarnings((v) => !v)}
            className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] transition-colors"
          >
            {ignoreWarnings ? '显示警告' : '忽略警告'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-0">
        <div className="p-3 border-r border-[var(--border-subtle)]">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-2">原文</div>
          {renderOriginal()}
        </div>
        <div className="p-3">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-2">建议稿</div>
          {renderSuggested()}
        </div>
      </div>

      {contextDebug && <ContextDebugPanel value={contextDebug} />}
    </div>
  );
}
