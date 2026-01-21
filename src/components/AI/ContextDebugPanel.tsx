import React, { useMemo } from 'react';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';

import { clipboardOps } from '../../lib/ipc';

import type { ContextFragment, ContextLayer, TokenStats } from '../../types/context';
import type { ContextDebugState } from '../../types/context-debug';

type ContextDebugPanelProps = {
  value: ContextDebugState;
};

function formatLayer(layer: ContextLayer): string {
  if (layer === 'rules') return 'Rules';
  if (layer === 'settings') return 'Settings';
  if (layer === 'retrieved') return 'Retrieved';
  return 'Immediate';
}

function formatSource(source: ContextFragment['source']): string {
  if (source.kind === 'file') return source.path;
  if (source.kind === 'module') return `module:${source.id}`;
  return `conversation:${source.id} (${source.path})`;
}

/**
 * Redacts secrets from prompt/chunk content.
 * Why: ContextViewer is meant for inspection, but must not leak API keys/tokens if they appear in rules/settings by mistake.
 */
function redactSensitive(text: string): string {
  const raw = typeof text === 'string' ? text : '';
  if (!raw) return '';

  const patterns: Array<[RegExp, string]> = [
    [/(sk-(?:ant|proj|live|test)?-[A-Za-z0-9_-]{16,})/g, '***REDACTED***'],
    [/(gh[pousr]_[A-Za-z0-9]{20,})/g, '***REDACTED***'],
    [/(Bearer\\s+)[A-Za-z0-9._-]{16,}/gi, '$1***REDACTED***'],
    [/((?:api[_-]?key|token|secret|password)\\s*[:=]\\s*)([^\\s"'`]{8,})/gi, '$1***REDACTED***'],
  ];

  return patterns.reduce((acc, [re, replacement]) => acc.replace(re, replacement), raw);
}

function summarizeTokenStats(stats: TokenStats) {
  return {
    total: `${stats.total.used}/${stats.total.limit}`,
    layers: {
      rules: `${stats.layers.rules.used}/${stats.layers.rules.budget}`,
      settings: `${stats.layers.settings.used}/${stats.layers.settings.budget}`,
      retrieved: `${stats.layers.retrieved.used}/${stats.layers.retrieved.budget}`,
      immediate: `${stats.layers.immediate.used}/${stats.layers.immediate.budget}`,
    },
    estimated: stats.estimated,
  };
}

/**
 * Renders the "查看上下文" expandable panel for a single AI run.
 * Why: provide explainable prompt structure + token usage + trimming evidence to debug context engineering.
 */
export function ContextDebugPanel({ value }: ContextDebugPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [copyState, setCopyState] = React.useState<{ key: 'system' | 'user' | 'full' | null; status: 'idle' | 'ok' | 'error' }>({
    key: null,
    status: 'idle',
  });

  const assembled = value.assembled;
  const tokenSummary = useMemo(() => (assembled ? summarizeTokenStats(assembled.tokenStats) : null), [assembled]);
  const metrics = assembled?.metrics ?? null;

  const byLayer = useMemo(() => {
    const fragments = assembled?.fragments ?? [];
    const groups: Record<ContextLayer, ContextFragment[]> = { rules: [], settings: [], retrieved: [], immediate: [] };
    for (const frag of fragments) groups[frag.layer].push(frag);
    return groups;
  }, [assembled]);

  const fragmentById = useMemo(() => {
    const map = new Map<string, ContextFragment>();
    for (const frag of assembled?.fragments ?? []) map.set(frag.id, frag);
    return map;
  }, [assembled]);

  const evidence = assembled?.budgetEvidence;
  const removed = evidence?.removed ?? [];
  const compressed = evidence?.compressed ?? [];
  const savedTokens = removed.reduce((sum, r) => sum + r.tokenCount, 0) + compressed.reduce((sum, c) => sum + c.savedTokens, 0);

  const onCopy = async (kind: 'system' | 'user' | 'full') => {
    if (!assembled) return;
    const system = redactSensitive(assembled.systemPrompt);
    const user = redactSensitive(assembled.userContent);
    const text = kind === 'system' ? system : kind === 'user' ? user : `# System Prompt\n\n${system}\n\n# User Content\n\n${user}\n`;

    setCopyState({ key: kind, status: 'idle' });
    try {
      await clipboardOps.writeText(text);
      setCopyState({ key: kind, status: 'ok' });
      window.setTimeout(() => setCopyState({ key: null, status: 'idle' }), 900);
    } catch {
      setCopyState({ key: kind, status: 'error' });
      window.setTimeout(() => setCopyState({ key: null, status: 'idle' }), 1500);
    }
  };

  const canToggle = value.status !== 'assembling' || Boolean(assembled);
  const toggleLabel = assembled ? '查看上下文' : value.status === 'assembling' ? '正在组装上下文…' : '查看上下文';

  return (
    <div data-testid="ai-context-debug" className="border-t border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={() => (canToggle ? setOpen((v) => !v) : undefined)}
        disabled={!canToggle}
        data-testid="ai-context-toggle"
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60 disabled:pointer-events-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">{toggleLabel}</span>
          {tokenSummary && (
            <span className="text-[11px] text-[var(--text-tertiary)]">
              Total {tokenSummary.total}
              {tokenSummary.estimated ? ' (est)' : ''}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />}
      </button>

      {open && (
        <div data-testid="ai-context-panel" className="px-3 pb-3 space-y-3">
          {value.status === 'error' && value.errorMessage && (
            <div className="px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-red-500/10 text-[12px] text-red-200">
              上下文组装失败：{value.errorMessage}
            </div>
          )}

          {assembled && (
            <>
              <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[var(--text-secondary)] font-medium">Token 统计</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCopy('full')}
                      className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                    >
                      {copyState.key === 'full' && copyState.status === 'ok' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          已复制
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          复制完整 Prompt
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                {tokenSummary && (
                  <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)] grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[var(--text-secondary)]">Total</div>
                      <div>
                        {tokenSummary.total}
                        {tokenSummary.estimated ? ' (estimate)' : ''}
                      </div>
                    </div>
                    {metrics && (
                      <div>
                        <div className="text-[var(--text-secondary)]">Prefix Hash</div>
                        <div data-testid="ai-context-prefix-hash" className="font-mono">
                          {metrics.prefixHash}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[var(--text-secondary)]">Rules</div>
                      <div>{tokenSummary.layers.rules}</div>
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)]">Settings</div>
                      <div>{tokenSummary.layers.settings}</div>
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)]">Retrieved</div>
                      <div>{tokenSummary.layers.retrieved}</div>
                    </div>
                    <div>
                      <div className="text-[var(--text-secondary)]">Immediate</div>
                      <div>{tokenSummary.layers.immediate}</div>
                    </div>
                    {metrics && (
                      <div>
                        <div className="text-[var(--text-secondary)]">Assemble</div>
                        <div data-testid="ai-context-assemble-ms" className="tabular-nums">
                          {metrics.assembleMs}ms
                        </div>
                      </div>
                    )}
                    {metrics && (
                      <div>
                        <div className="text-[var(--text-secondary)]">Settings Cache</div>
                        <div className="tabular-nums">{metrics.settingsPrefetchHit ? 'hit' : 'miss'}</div>
                      </div>
                    )}
                  </div>
                )}

                {(removed.length > 0 || compressed.length > 0) && (
                  <div data-testid="ai-context-trim" className="px-3 py-2 border-t border-[var(--border-subtle)]">
                    <div className="text-[12px] text-[var(--text-secondary)] font-medium mb-1">裁剪摘要</div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      删除 {removed.length} 段，压缩 {compressed.length} 段，节省 {savedTokens} tokens
                    </div>
                    <div className="mt-2 space-y-1">
                      {removed.map((r) => (
                        <div
                          key={`removed:${r.fragmentId}`}
                          className="text-[11px] text-[var(--text-tertiary)] flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-[var(--text-secondary)]">{formatLayer(r.layer)}</span>
                            <span className="text-[var(--text-tertiary)]"> · {formatSource(r.source)}</span>
                            <span className="text-[var(--text-tertiary)]"> · {r.reason}</span>
                          </div>
                          <div className="flex-shrink-0 tabular-nums">{r.tokenCount}</div>
                        </div>
                      ))}
                      {compressed.map((c) => (
                        <div key={`compressed:${c.toFragmentId}`} className="text-[11px] text-[var(--text-tertiary)] flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {(() => {
                              const frag = fragmentById.get(c.toFragmentId) ?? null;
                              const label = frag ? `${formatLayer(frag.layer)} · ${formatSource(frag.source)}` : c.toFragmentId;
                              return (
                                <>
                                  <span className="text-[var(--text-secondary)]">{label}</span>
                                  <span className="text-[var(--text-tertiary)]"> · {c.reason}</span>
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex-shrink-0 tabular-nums">-{c.savedTokens}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <div className="text-[12px] text-[var(--text-secondary)] font-medium">Prompt</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCopy('system')}
                      className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                    >
                      {copyState.key === 'system' && copyState.status === 'ok' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          已复制
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          复制 System
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCopy('user')}
                      className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                    >
                      {copyState.key === 'user' && copyState.status === 'ok' ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          已复制
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Copy className="w-3.5 h-3.5" />
                          复制 User
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-0">
                  <div className="p-3 border-b border-[var(--border-subtle)]">
                    <div className="text-[11px] text-[var(--text-tertiary)] mb-2">System Prompt</div>
                    <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[var(--text-secondary)] font-mono">
                      {redactSensitive(assembled.systemPrompt)}
                    </pre>
                  </div>
                  <div className="p-3">
                    <div className="text-[11px] text-[var(--text-tertiary)] mb-2">User Content</div>
                    <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[var(--text-secondary)] font-mono">
                      {redactSensitive(assembled.userContent)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                  <div className="text-[12px] text-[var(--text-secondary)] font-medium">Chunks</div>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {(['rules', 'settings', 'retrieved', 'immediate'] as const).map((layer) => (
                    <div key={layer} data-testid={`ai-context-layer-${layer}`} className="px-3 py-2">
                      <div className="text-[12px] text-[var(--text-secondary)] font-medium mb-2">{formatLayer(layer)}</div>
                      {byLayer[layer].length === 0 ? (
                        <div className="text-[11px] text-[var(--text-tertiary)]">(empty)</div>
                      ) : (
                        <div className="space-y-1">
                          {byLayer[layer].map((frag) => (
                            <details key={frag.id} className="rounded-md border border-[var(--border-subtle)] overflow-hidden">
                              <summary className="cursor-pointer select-none px-2.5 py-2 flex items-center justify-between gap-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors">
                                <span className="min-w-0 truncate text-[11px] text-[var(--text-secondary)]">{formatSource(frag.source)}</span>
                                <span className="flex-shrink-0 tabular-nums text-[11px] text-[var(--text-tertiary)]">{frag.tokenCount}</span>
                              </summary>
                              <div className="px-2.5 py-2">
                                <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[var(--text-secondary)] font-mono">
                                  {redactSensitive(frag.content)}
                                </pre>
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {value.status === 'assembling' && (
            <div className="px-3 py-2 rounded-md border border-[var(--border-subtle)] text-[12px] text-[var(--text-tertiary)]">
              正在组装上下文…（读取 Rules/Settings/History/Immediate）
            </div>
          )}
        </div>
      )}
    </div>
  );
}
