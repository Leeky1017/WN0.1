/**
 * AIPanel (feature)
 * Why: Connect presentational UI to real AI orchestration (skills list + streaming + cancel) via useAISkill + stores.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Send, Square } from 'lucide-react';

import { MessageBubble } from '@/components/composed/message-bubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAIStore } from '@/stores/aiStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSettingsPanelStore } from '@/stores/settingsPanelStore';

import { useAISkill } from './useAISkill';

export function AIPanel() {
  const { skillsLoading, skillsError, sendMessage, cancelRun, acceptDiff, rejectDiff } = useAISkill();

  const skills = useAIStore((s) => s.skills);
  const selectedSkillId = useAIStore((s) => s.selectedSkillId);
  const setSelectedSkillId = useAIStore((s) => s.setSelectedSkillId);
  const input = useAIStore((s) => s.input);
  const setInput = useAIStore((s) => s.setInput);
  const messages = useAIStore((s) => s.messages);
  const status = useAIStore((s) => s.status);
  const lastError = useAIStore((s) => s.lastError);
  const diff = useAIStore((s) => s.diff);

  const [isApplying, setIsApplying] = useState(false);

  const canSend = Boolean((selectedSkillId ?? '').trim()) && status !== 'thinking' && status !== 'streaming' && !diff;
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
      // Priority: Review -> AI cancel -> Focus exit -> overlays close.
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
  }, [cancelRun, rejectDiff]);

  return (
    <div className="h-full w-full flex flex-col bg-[var(--bg-surface)]" data-testid="ai-panel">
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">AI</span>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="h-7 pl-2 pr-7 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-muted)] focus:outline-none focus:border-[var(--border-focus)]"
              value={selectedSkillId ?? ''}
              onChange={(e) => setSelectedSkillId(e.target.value || null)}
              disabled={skillsLoading || skills.length === 0}
              aria-label="Select skill"
            >
              <option value="" disabled>
                {skillsLoading ? '加载 Skills…' : skills.length ? '选择 Skill' : '无 Skills'}
              </option>
              {skills
                .filter((s) => s.enabled && s.valid)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] pointer-events-none" />
          </div>

          {canCancel ? (
            <Button variant="danger" size="sm" leftIcon={<Square size={14} />} onClick={() => void handleCancel()}>
              取消
            </Button>
          ) : (
            <Button variant="primary" size="sm" leftIcon={<Send size={14} />} onClick={() => void handleSend()} disabled={!canSend}>
              发送
            </Button>
          )}
        </div>
      </div>

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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {messages.length === 0 && (
            <div className="text-[11px] text-[var(--fg-muted)]">
              选择一个 Skill，然后输入指令（或留空以直接运行 Skill）。
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入指令…（Ctrl/Cmd+Enter 发送）"
          className="min-h-[72px]"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <div className="flex items-center justify-between text-[10px] text-[var(--fg-subtle)]">
          <span>{status === 'streaming' ? '输出中…' : status === 'thinking' ? '思考中…' : status === 'error' ? '错误' : '就绪'}</span>
          <span className="tabular-nums">{input.length} chars</span>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
