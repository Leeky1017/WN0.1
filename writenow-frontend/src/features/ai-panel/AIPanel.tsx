/**
 * AIPanel (feature)
 * Why: Connect presentational UI to real AI orchestration (skills list + streaming + cancel) via useAISkill + stores.
 *
 * Layout (Cursor-style):
 * - Minimal header: title, context preview toggle, collapse button
 * - Message list in the middle (flex-1)
 * - Bottom input area: input + send button on same line
 * - Bottom toolbar: Mode / Model / Skill selectors
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, ChevronDown, ChevronRight, PanelRightClose, Send, Square } from 'lucide-react';

import { MessageBubble } from '@/components/composed/message-bubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { invokeSafe } from '@/lib/rpc';
import { useAIStore, type AiMode } from '@/stores/aiStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSettingsPanelStore } from '@/stores/settingsPanelStore';

import { ContextPreview } from './ContextPreview';
import { SlashCommandMenu } from './SlashCommandMenu';
import { useAISkill } from './useAISkill';

/** Mode display labels. */
const MODE_LABELS: Record<AiMode, string> = {
  agent: 'Agent',
  plan: 'Plan',
  ask: 'Ask',
};

export function AIPanel() {
  const { skillsLoading, skillsError, sendMessage, cancelRun, acceptDiff, rejectDiff } = useAISkill();

  const skills = useAIStore((s) => s.skills);
  const selectedSkillId = useAIStore((s) => s.selectedSkillId);
  const setSelectedSkillId = useAIStore((s) => s.setSelectedSkillId);
  const mode = useAIStore((s) => s.mode);
  const setMode = useAIStore((s) => s.setMode);
  const selectedModelId = useAIStore((s) => s.selectedModelId);
  const setSelectedModelId = useAIStore((s) => s.setSelectedModelId);
  const models = useAIStore((s) => s.models);
  const input = useAIStore((s) => s.input);
  const setInput = useAIStore((s) => s.setInput);
  const messages = useAIStore((s) => s.messages);
  const status = useAIStore((s) => s.status);
  const lastError = useAIStore((s) => s.lastError);
  const diff = useAIStore((s) => s.diff);

  const toggleRightPanel = useLayoutStore((s) => s.toggleRightPanel);

  const [isApplying, setIsApplying] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
  const [contextExpanded, setContextExpanded] = useState(false);

  // Slash command menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load current project ID for context preview
  useEffect(() => {
    invokeSafe('project:getCurrent', {}).then((res) => {
      setCurrentProjectId(res?.projectId ?? undefined);
    }).catch(() => {
      // Why: Project context is optional; failures are non-blocking.
    });
  }, []);

  // Handle slash command detection
  useEffect(() => {
    // Check if input starts with "/" to show slash command menu
    if (input.startsWith('/')) {
      setSlashMenuOpen(true);
      setSlashFilter(input.slice(1)); // Filter text after "/"
    } else {
      setSlashMenuOpen(false);
      setSlashFilter('');
    }
  }, [input]);

  const handleSlashSelect = useCallback((command: string) => {
    setInput(command + ' ');
    setSlashMenuOpen(false);
    // Focus back to input
    inputRef.current?.focus();
  }, [setInput]);

  const canSend = status !== 'thinking' && status !== 'streaming' && !diff;
  const canCancel = status === 'thinking' || status === 'streaming';

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const value = input.trim();
    setInput('');
    await sendMessage(value);
  }, [canSend, input, sendMessage, setInput]);

  const handleCancel = useCallback(async () => {
    if (!canCancel) return;
    await cancelRun();
  }, [cancelRun, canCancel]);

  const handleReject = useCallback(async () => {
    if (!diff) return;
    await rejectDiff();
  }, [diff, rejectDiff]);

  const handleAccept = useCallback(async () => {
    if (!diff) return;
    if (isApplying) return;
    setIsApplying(true);
    try {
      await acceptDiff();
    } finally {
      // Why: CI flakes showed `wm-review-root` can remain visible after clicking Accept even when the editor diff session
      // has already been cleared/applied. We force-clear the Review UI if there is no surfaced error so the user/test
      // is never stuck in review state.
      const state = useAIStore.getState();
      if (state.diff && !state.lastError) {
        state.setDiff(null);
        useEditorRuntimeStore.getState().activeEditor?.commands.clearAiDiff();
      }
      setIsApplying(false);
    }
  }, [acceptDiff, diff, isApplying]);

  useEffect(() => {
    const focusEditor = () => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[data-testid="tiptap-editor"]');
        el?.focus();
      });
    };

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      // Why: Esc must follow a stable priority to keep Write Mode predictable.
      // Priority: Slash menu -> Review -> AI cancel -> Focus exit -> overlays close.
      if (slashMenuOpen) {
        event.preventDefault();
        setSlashMenuOpen(false);
        return;
      }

      const ai = useAIStore.getState();
      if (ai.diff) {
        event.preventDefault();
        void rejectDiff();
        return;
      }

      if (ai.status === 'thinking' || ai.status === 'streaming') {
        event.preventDefault();
        void cancelRun();
        return;
      }

      const layout = useLayoutStore.getState();
      if (layout.focusMode) {
        event.preventDefault();
        layout.exitFocusMode();
        return;
      }

      const cmdk = useCommandPaletteStore.getState();
      if (cmdk.open) {
        event.preventDefault();
        cmdk.closePalette();
        focusEditor();
        return;
      }

      const settings = useSettingsPanelStore.getState();
      if (settings.open) {
        event.preventDefault();
        settings.closePanel();
        focusEditor();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelRun, rejectDiff, slashMenuOpen]);

  return (
    <div className="h-full w-full flex flex-col bg-[var(--bg-surface)]" data-testid="ai-panel">
      {/* Minimal Header */}
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">AI</span>

          {/* Context Preview Toggle */}
          <button
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => setContextExpanded(!contextExpanded)}
            aria-label="切换上下文预览"
          >
            <Brain size={12} className="text-[var(--accent-default)]" />
            {contextExpanded ? (
              <ChevronDown size={12} className="text-[var(--fg-subtle)]" />
            ) : (
              <ChevronRight size={12} className="text-[var(--fg-subtle)]" />
            )}
          </button>
        </div>

        {/* Collapse Button */}
        <button
          className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
          onClick={toggleRightPanel}
          aria-label="收起 AI 面板"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Context Preview (collapsible) */}
      {contextExpanded && <ContextPreview projectId={currentProjectId} />}

      {skillsError && (
        <div className="px-3 py-2 text-[11px] text-[var(--error)] border-b border-[var(--border-subtle)]">
          Skills 加载失败：{skillsError}
        </div>
      )}

      {lastError && (
        <div className="px-3 py-2 text-[11px] text-[var(--error)] border-b border-[var(--border-subtle)]">
          {lastError.code}: {lastError.message}
        </div>
      )}

      {diff && (
        <div className="px-3 py-3 border-b border-[var(--border-subtle)]" data-testid="wm-review-root">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold text-[var(--fg-default)]">Reviewing AI changes</div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                data-testid="wm-review-reject"
                onClick={() => void handleReject()}
                disabled={isApplying}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                data-testid="wm-review-accept"
                onClick={() => void handleAccept()}
                loading={isApplying}
              >
                Accept
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Original</div>
              <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-input)] p-2 text-[11px] leading-5 text-[var(--fg-muted)] whitespace-pre-wrap break-words">
                {diff.originalText}
              </pre>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Suggested</div>
              <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-input)] p-2 text-[11px] leading-5 text-[var(--fg-default)] whitespace-pre-wrap break-words">
                {diff.suggestedText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {messages.length === 0 && (
            <div className="text-[11px] text-[var(--fg-muted)]">
              输入指令开始对话，或使用 / 查看可用命令。
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Input Row: Textarea + Send Button */}
        <div className="p-3 relative">
          {/* Slash Command Menu */}
          <SlashCommandMenu
            open={slashMenuOpen}
            filter={slashFilter}
            onSelect={handleSlashSelect}
            onClose={() => setSlashMenuOpen(false)}
          />

          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入指令…（/ 查看命令，Ctrl+Enter 发送）"
              className="flex-1 min-h-[56px] max-h-[120px] resize-none"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              data-testid="ai-input"
            />
            {canCancel ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => void handleCancel()}
                aria-label="取消"
                data-testid="ai-cancel-btn"
              >
                <Square size={16} />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => void handleSend()}
                disabled={!canSend}
                aria-label="发送"
                data-testid="ai-send-btn"
              >
                <Send size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar Row: Mode / Model / Skill */}
        <div className="px-3 pb-3 flex items-center gap-2">
          {/* Mode Selector */}
          <div className="relative">
            <select
              className="h-7 pl-2 pr-6 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-muted)] focus:outline-none focus:border-[var(--border-focus)] appearance-none cursor-pointer"
              value={mode}
              onChange={(e) => setMode(e.target.value as AiMode)}
              aria-label="选择模式"
              data-testid="ai-mode-select"
            >
              <option value="agent">{MODE_LABELS.agent}</option>
              <option value="plan">{MODE_LABELS.plan}</option>
              <option value="ask">{MODE_LABELS.ask}</option>
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] pointer-events-none" />
          </div>

          {/* Model Selector */}
          <div className="relative">
            <select
              className="h-7 pl-2 pr-6 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-muted)] focus:outline-none focus:border-[var(--border-focus)] appearance-none cursor-pointer"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              aria-label="选择模型"
              data-testid="ai-model-select"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] pointer-events-none" />
          </div>

          {/* Skill Selector */}
          <div className="relative flex-1 min-w-0">
            <select
              className="w-full h-7 pl-2 pr-6 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-muted)] focus:outline-none focus:border-[var(--border-focus)] appearance-none cursor-pointer truncate"
              value={selectedSkillId ?? ''}
              onChange={(e) => setSelectedSkillId(e.target.value || null)}
              disabled={skillsLoading || skills.length === 0}
              aria-label="选择 Skill"
              data-testid="ai-skill-select"
            >
              <option value="">
                {skillsLoading ? '加载…' : skills.length ? '选择 Skill' : '无 Skill'}
              </option>
              {skills
                .filter((s) => s.enabled && s.valid)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] pointer-events-none" />
          </div>

          {/* Status Indicator */}
          <span className="text-[10px] text-[var(--fg-subtle)] shrink-0">
            {status === 'streaming' ? '输出中…' : status === 'thinking' ? '思考中…' : status === 'error' ? '错误' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
