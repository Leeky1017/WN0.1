/**
 * AIPanel
 * Why: Deliver Cursor-style AI chat, streaming, diff preview, and slash commands inside the right panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Circle, AlertTriangle } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { mergeDiff } from '@/lib/diff/diffUtils';
import { useAIStore } from '@/stores/aiStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import type { SkillListItem } from '@/types/ipc-generated';

import { useAISkill } from './useAISkill';
import { MessageList } from './components/MessageList';
import { AIInput } from './components/AIInput';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { DiffView } from './components/DiffView';
import type { SlashCommand } from './hooks/useSlashCommand';

/**
 * Why: Slash command labels must remain stable even if skill display names change.
 */
function skillToCommand(skill: SkillListItem): SlashCommand {
  const fallback = skill.name || skill.id;
  const slug = skill.id.split(':').pop() || fallback;
  const normalized = slug.trim().replace(/\s+/g, '-').toLowerCase();
  return {
    id: skill.id,
    name: `/${normalized || fallback}`,
    description: skill.description || skill.name || fallback,
    skillId: skill.id,
  };
}

/**
 * AI panel component rendered in the right dock.
 */
export function AIPanel() {
  const { aiStatus, skillsStatus, skillsLoading, skillsError, sendMessage, cancelRun } = useAISkill();

  const messages = useAIStore((state) => state.messages);
  const input = useAIStore((state) => state.input);
  const status = useAIStore((state) => state.status);
  const diff = useAIStore((state) => state.diff);
  const lastError = useAIStore((state) => state.lastError);
  const skills = useAIStore((state) => state.skills);
  const selectedSkillId = useAIStore((state) => state.selectedSkillId);

  const setInput = useAIStore((state) => state.setInput);
  const setSelectedSkillId = useAIStore((state) => state.setSelectedSkillId);
  const setDiff = useAIStore((state) => state.setDiff);
  const resetError = useAIStore((state) => state.resetError);

  const selection = useEditorRuntimeStore((state) => state.selection);

  const [panelError, setPanelError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  const commands = useMemo(() => skills.filter((skill) => skill.valid).map(skillToCommand), [skills]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [skills, selectedSkillId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, diff, status]);

  useEffect(() => {
    if (status !== 'thinking' && status !== 'streaming') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      void cancelRun();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelRun, status]);

  const handleSend = useCallback(
    async (value: string, options?: { skillId?: string }) => {
      setPanelError(null);
      resetError();
      await sendMessage(value, options);
    },
    [resetError, sendMessage],
  );

  const handleAcceptDiff = useCallback(() => {
    if (!diff) return;
    setPanelError(null);

    try {
      const merged = mergeDiff(diff.originalText, diff.suggestedText, diff.accepted);
      const { activeEditor, activeFilePath, selection: runtimeSelection } = useEditorRuntimeStore.getState();
      const targetSelection = diff.selection ?? runtimeSelection;
      if (!activeEditor) {
        setPanelError('当前没有可应用的编辑器');
        return;
      }

      if (!targetSelection) {
        // No selection captured: replace the entire document.
        activeEditor.commands.setContent(merged, { contentType: 'markdown' });
      } else {
        if (activeFilePath && targetSelection.filePath !== activeFilePath) {
          setPanelError('AI 修改来源与当前编辑器不一致');
          return;
        }
        activeEditor
          .chain()
          .focus()
          .insertContentAt({ from: targetSelection.from, to: targetSelection.to }, merged)
          .run();
      }
      setDiff(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '应用失败';
      setPanelError(message);
    }
  }, [diff, setDiff]);

  const handleRejectDiff = useCallback(() => {
    setDiff(null);
  }, [setDiff]);

  useEffect(() => {
    if (!diff) return;

    const handleDiffHotkeys = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAcceptDiff();
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleRejectDiff();
      }
    };

    window.addEventListener('keydown', handleDiffHotkeys);
    return () => window.removeEventListener('keydown', handleDiffHotkeys);
  }, [diff, handleAcceptDiff, handleRejectDiff]);

  const handleToggleHunk = useCallback(
    (index: number) => {
      if (!diff) return;
      const next = diff.accepted.slice();
      next[index] = !next[index];
      setDiff({ ...diff, accepted: next });
    },
    [diff, setDiff],
  );

  const handleAcceptAll = useCallback(() => {
    if (!diff) return;
    setDiff({ ...diff, accepted: diff.accepted.map(() => true) });
  }, [diff, setDiff]);

  const handleRejectAll = useCallback(() => {
    if (!diff) return;
    setDiff({ ...diff, accepted: diff.accepted.map(() => false) });
  }, [diff, setDiff]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)]" data-testid="layout-ai-panel">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--blue-700)] flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--text-primary)]">AI 助手</span>
          <span className="text-[10px] text-[var(--text-muted)]">AI 面板 · Phase 3</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Circle
              className={cn(
                'h-2 w-2',
                aiStatus === 'connected' ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]',
              )}
            />
            AI
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Circle
              className={cn(
                'h-2 w-2',
                skillsStatus === 'connected' ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]',
              )}
            />
            Skills
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <div className="flex-1">
          <Select value={selectedSkillId ?? undefined} onValueChange={setSelectedSkillId} disabled={skillsLoading}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="选择技能" />
            </SelectTrigger>
            <SelectContent>
              {skills.filter((skill) => skill.valid).map((skill) => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={status !== 'thinking' && status !== 'streaming'}
          onClick={() => void cancelRun()}
        >
          取消 (Esc)
        </Button>
      </div>

      {skillsError && (
        <div className="px-4 py-2 text-xs text-[var(--color-error)] border-b border-[var(--border-subtle)]">
          {skillsError}
        </div>
      )}

      {status === 'canceled' && (
        <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          已取消
        </div>
      )}

      {panelError && (
        <div className="px-4 py-2 text-xs text-[var(--color-error)] border-b border-[var(--border-subtle)] flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          {panelError}
        </div>
      )}

      {lastError && (
        <div className="px-4 py-2 text-xs text-[var(--color-error)] border-b border-[var(--border-subtle)]">
          {lastError.code}: {lastError.message}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4">
          <MessageList messages={messages} />
          {status === 'thinking' && <ThinkingIndicator />}
          {diff && (
            <div className="mt-4">
              <DiffView
                diff={diff}
                onToggleHunk={handleToggleHunk}
                onAccept={handleAcceptDiff}
                onReject={handleRejectDiff}
                onAcceptAll={handleAcceptAll}
                onRejectAll={handleRejectAll}
              />
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-2">
          <span>
            {selectedSkill ? `当前技能：${selectedSkill.name}` : '请选择技能'}
          </span>
          <span>
            {selection?.text?.trim() ? `选区 ${selection.text.length} 字` : '无选区'}
          </span>
        </div>
        <AIInput
          value={input}
          disabled={skillsLoading || status === 'thinking' || status === 'streaming'}
          commands={commands}
          onChange={setInput}
          onSend={handleSend}
          onSelectSkill={setSelectedSkillId}
        />
      </div>
    </div>
  );
}

export default AIPanel;
