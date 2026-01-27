/**
 * useAISkill
 * Why: Keep AI panel orchestration (skills list, streaming runs, cancel) out of presentational components.
 *
 * Design notes:
 * - We connect to Theia JSON-RPC services for AI + Skills to receive streaming notifications.
 * - We capture a stable selection snapshot at run start so diff application remains deterministic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EditorSelectionSnapshot } from '@/stores/editorRuntimeStore';
import { computeDiff } from '@/lib/diff/diffUtils';
import { assembleSkillRunRequest } from '@/lib/ai/context-assembler';
import { invokeSafe } from '@/lib/rpc';
import { aiClient } from '@/lib/rpc/ai-client';
import { subscribeToAiStream } from '@/lib/rpc/ai-stream';
import type { JsonRpcConnectionStatus } from '@/lib/rpc/jsonrpc-client';
import { skillsClient } from '@/lib/rpc/skills-client';
import { useAIStore } from '@/stores/aiStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useStatusBarStore } from '@/stores/statusBarStore';
import type { IpcError } from '@/types/ipc-generated';

export type SendMessageOptions = {
  skillId?: string;
};

export interface UseAISkillResult {
  aiStatus: JsonRpcConnectionStatus;
  skillsStatus: JsonRpcConnectionStatus;
  skillsLoading: boolean;
  skillsError: string | null;
  sendMessage: (value: string, options?: SendMessageOptions) => Promise<void>;
  cancelRun: () => Promise<void>;
}

function toIpcError(error: unknown): IpcError {
  if (error && typeof error === 'object') {
    const record = error as { code?: unknown; message?: unknown; details?: unknown; retryable?: unknown };
    if (typeof record.code === 'string' && typeof record.message === 'string') {
      return {
        code: record.code as IpcError['code'],
        message: record.message,
        ...(typeof record.details === 'undefined' ? {} : { details: record.details }),
        ...(typeof record.retryable === 'boolean' ? { retryable: record.retryable } : {}),
      };
    }
  }
  return { code: 'INTERNAL', message: error instanceof Error ? error.message : 'Unknown error' };
}

function formatSkillLabel(skillId: string): string {
  const slug = skillId.split(':').pop() ?? skillId;
  return `/${slug}`;
}

function captureSelection(selection: EditorSelectionSnapshot | null): EditorSelectionSnapshot | null {
  if (!selection) return null;
  return { ...selection };
}

export function useAISkill(): UseAISkillResult {
  const setSkills = useAIStore((s) => s.setSkills);
  const selectedSkillId = useAIStore((s) => s.selectedSkillId);
  const setSelectedSkillId = useAIStore((s) => s.setSelectedSkillId);

  const addUserMessage = useAIStore((s) => s.addUserMessage);
  const ensureAssistantMessage = useAIStore((s) => s.ensureAssistantMessage);
  const appendToMessage = useAIStore((s) => s.appendToMessage);
  const setMessageContent = useAIStore((s) => s.setMessageContent);
  const startRun = useAIStore((s) => s.startRun);
  const setStreaming = useAIStore((s) => s.setStreaming);
  const finishRun = useAIStore((s) => s.finishRun);
  const failRun = useAIStore((s) => s.failRun);
  const cancelRunLocal = useAIStore((s) => s.cancelRun);
  const setDiff = useAIStore((s) => s.setDiff);

  const setStatusBarAIStatus = useStatusBarStore((s) => s.setAIStatus);

  const selection = useEditorRuntimeStore((s) => s.selection);
  const activeEditor = useEditorRuntimeStore((s) => s.activeEditor);
  const activeFilePath = useEditorRuntimeStore((s) => s.activeFilePath);

  const [aiStatus, setAiStatus] = useState<JsonRpcConnectionStatus>(aiClient.status);
  const [skillsStatus, setSkillsStatus] = useState<JsonRpcConnectionStatus>(skillsClient.status);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const selectionSnapshotRef = useRef<EditorSelectionSnapshot | null>(null);
  const sourceTextRef = useRef<string>('');

  const refreshSkills = useCallback(async () => {
    setSkillsLoading(true);
    setSkillsError(null);

    try {
      await skillsClient.connect();
      const res = await skillsClient.listSkills({ includeDisabled: false });
      if (!res.ok) throw new Error(res.error.message);

      const list = res.data.skills;
      setSkills(list);

      if (!selectedSkillId) {
        const defaultSkill = list.find((s) => s.id === 'builtin:polish') ?? list[0];
        if (defaultSkill) setSelectedSkillId(defaultSkill.id);
      }
    } catch (error) {
      setSkillsError(error instanceof Error ? error.message : 'Failed to load skills');
    } finally {
      setSkillsLoading(false);
    }
  }, [selectedSkillId, setSelectedSkillId, setSkills]);

  useEffect(() => {
    // 设置重连成功回调，自动刷新 skills
    skillsClient.setOnReconnected(() => {
      console.log('[AI] Skills client reconnected, refreshing skills...');
      void refreshSkills();
    });

    void aiClient.connect().catch((error) => {
      console.warn('[AI] connect failed:', error);
      // Why: Connection errors are surfaced via aiStatus + panel UI.
    });
    void refreshSkills();

    const unsubAi = aiClient.onStatusChange((status) => setAiStatus(status));
    const unsubSkills = skillsClient.onStatusChange((status) => setSkillsStatus(status));

    return () => {
      unsubAi();
      unsubSkills();
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      // Why: Keep shared JSON-RPC connections alive across panels (AI panel + inline AI) to avoid
      // tearing down active streams when another consumer unmounts.
    };
  }, [refreshSkills]);

  const cancelRun = useCallback(async () => {
    const runId = useAIStore.getState().currentRunId;
    if (!runId) return;

    try {
      await aiClient.cancel({ runId });
    } catch (error) {
      console.warn('[AI] cancel failed:', error);
      // Why: Cancellation is best-effort; we still clear pending state to avoid UI deadlocks.
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      cancelRunLocal();
      setStatusBarAIStatus('idle', '');
    }
  }, [cancelRunLocal, setStatusBarAIStatus]);

  const isReady = useMemo(() => aiStatus === 'connected' && skillsStatus === 'connected', [aiStatus, skillsStatus]);

  const sendMessage = useCallback(
    async (value: string, options?: SendMessageOptions) => {
      const skillId = (options?.skillId ?? selectedSkillId ?? '').trim();
      if (!skillId) {
        failRun({ code: 'INVALID_ARGUMENT', message: '未选择 Skill' });
        setStatusBarAIStatus('error', '未选择 Skill');
        return;
      }

      if (!isReady) {
        failRun({ code: 'INTERNAL', message: 'AI/Skills 未连接' });
        setStatusBarAIStatus('error', '未连接');
        return;
      }

      const selectionSnapshot = captureSelection(selection);
      selectionSnapshotRef.current = selectionSnapshot;

      const sourceText = selectionSnapshot?.text?.trim()
        ? selectionSnapshot.text
        : activeEditor
          ? activeEditor.state.doc.textContent
          : '';

      if (!sourceText.trim()) {
        failRun({ code: 'INVALID_ARGUMENT', message: '请选择文本或打开文件后再试' });
        setStatusBarAIStatus('error', '未选择文本');
        return;
      }

      sourceTextRef.current = sourceText;

      const instruction = value.trim();
      const userMessage = instruction || formatSkillLabel(skillId);
      addUserMessage(userMessage, skillId);
      const assistantId = ensureAssistantMessage(skillId);

      setDiff(null);
      setStatusBarAIStatus('thinking', 'AI 思考中…');

      try {
        const skillResp = await skillsClient.getSkill({ id: skillId });
        if (!skillResp.ok) throw new Error(skillResp.error.message);
        const definition = skillResp.data.skill.definition;
        if (!definition) throw new Error('Skill definition is unavailable');

        // Best-effort project context. If unavailable, we still run the skill.
        const project = await invokeSafe('project:getCurrent', {});
        const projectId = project?.projectId ?? undefined;
        const articleId = selectionSnapshot?.filePath ?? activeFilePath ?? undefined;

        const request = await assembleSkillRunRequest({
          skillId,
          definition,
          text: sourceText,
          instruction,
          selection: selectionSnapshot ? { from: selectionSnapshot.from, to: selectionSnapshot.to } : null,
          editor: activeEditor,
          projectId: projectId ?? undefined,
          articleId: articleId ?? undefined,
        });

        const start = await aiClient.streamResponse(request);
        if (!start.ok) {
          failRun(start.error);
          setStatusBarAIStatus('error', start.error.message);
          return;
        }

        const runId = start.data.runId;
        startRun(runId);

        unsubscribeRef.current?.();
        unsubscribeRef.current = subscribeToAiStream(
          runId,
          (delta) => {
            setStreaming();
            setStatusBarAIStatus('streaming', '输出中…');
            appendToMessage(assistantId, delta);
          },
          (result) => {
            finishRun();
            setStatusBarAIStatus('idle', '');

            const originalText = sourceTextRef.current;
            const suggestedText = result;
            setMessageContent(assistantId, suggestedText);
            const hunks = computeDiff(originalText, suggestedText);
            setDiff({ originalText, suggestedText, accepted: hunks.map(() => true), selection: selectionSnapshotRef.current });
          },
          (error) => {
            const ipc = toIpcError({ code: 'UPSTREAM_ERROR', message: error.message });
            failRun(ipc);
            setStatusBarAIStatus('error', ipc.message);
          },
        );
      } catch (error) {
        const ipc = toIpcError(error);
        failRun(ipc);
        setStatusBarAIStatus('error', ipc.message);
      }
    },
    [
      activeEditor,
      activeFilePath,
      addUserMessage,
      appendToMessage,
      ensureAssistantMessage,
      failRun,
      finishRun,
      isReady,
      selectedSkillId,
      selection,
      setDiff,
      setStatusBarAIStatus,
      setMessageContent,
      setStreaming,
      startRun,
    ],
  );

  return {
    aiStatus,
    skillsStatus,
    skillsLoading,
    skillsError,
    sendMessage,
    cancelRun,
  };
}

export default useAISkill;
