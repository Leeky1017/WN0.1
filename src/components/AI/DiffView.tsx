import React, { useMemo } from 'react';

import { diffChars } from '../../lib/textDiff';

type DiffViewStatus = 'streaming' | 'done' | 'error' | 'canceled';

type DiffViewProps = {
  title: string;
  originalText: string;
  suggestedText: string;
  status: DiffViewStatus;
  errorMessage?: string | null;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
  cancelLabel?: string;
};

export function DiffView({
  title,
  originalText,
  suggestedText,
  status,
  errorMessage,
  onAccept,
  onReject,
  onCancel,
  acceptLabel = '接受',
  rejectLabel = '拒绝',
  cancelLabel = '取消',
}: DiffViewProps) {
  const segments = useMemo(() => diffChars(originalText, suggestedText), [originalText, suggestedText]);

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
      {segments.map((seg, idx) => {
        if (seg.op === 'delete') return null;
        const className = seg.op === 'insert' ? 'bg-emerald-500/15 text-emerald-200' : 'text-[var(--text-secondary)]';
        return (
          <span key={idx} className={className}>
            {seg.text}
          </span>
        );
      })}
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

      {status === 'error' && errorMessage && (
        <div
          data-testid="ai-diff-error"
          className="px-3 py-2 border-b border-[var(--border-subtle)] text-[12px] text-red-300"
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
    </div>
  );
}
