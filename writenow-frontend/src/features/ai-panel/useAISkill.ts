/**
 * useAISkill
 * Why: Keep AI panel orchestration (skills list, streaming runs, cancel) out of presentational components.
 *
 * Design notes:
 * - We connect to Theia JSON-RPC services for AI + Skills to receive streaming notifications.
 * - We capture a stable selection snapshot at run start so diff application remains deterministic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';

import type { EditorSelectionSnapshot } from '@/stores/editorRuntimeStore';
import { computeDiff } from '@/lib/diff/diffUtils';
import { assembleSkillRunRequest } from '@/lib/ai/context-assembler';
import { wnPerfMark, wnPerfMeasure } from '@/lib/perf';
import { invoke, invokeSafe } from '@/lib/rpc';
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
  acceptDiff: () => Promise<void>;
  rejectDiff: () => Promise<void>;
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

/**
 * Bound an async operation with a timeout.
 *
 * Why: Some backend RPC calls can hang if the WebSocket stays open but the backend never replies. We use bounded
 * timeouts for best-effort side effects (e.g. version snapshots) so UI state can always clear and remain usable.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: IpcError): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timer = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function formatSkillLabel(skillId: string): string {
  const slug = skillId.split(':').pop() ?? skillId;
  return `/${slug}`;
}

/**
 * Why: Version history snapshot requires stable Markdown extraction from TipTap without tying callers to internal storage shape.
 */
function getMarkdownFromEditor(editor: Editor): string {
  const maybe = editor as unknown as {
    getMarkdown?: () => string;
    storage?: { markdown?: { getMarkdown?: () => string } };
  };
  if (typeof maybe.getMarkdown === 'function') return maybe.getMarkdown();
  const storageFn = maybe.storage?.markdown?.getMarkdown;
  if (typeof storageFn === 'function') return storageFn();
  return editor.getText();
}

function normalizeAiSelectionText(text: string): string {
  return text.replace(/\r\n/g, '\n').trimEnd();
}

function getEditorTextBetween(editor: Editor, from: number, to: number): string {
  return editor.state.doc.textBetween(from, to, '\n');
}

function isFullDocumentSelection(editor: Editor, selection: EditorSelectionSnapshot): boolean {
  const maxPos = editor.state.doc.content.size;
  const from = Math.min(selection.from, selection.to);
  const to = Math.max(selection.from, selection.to);

  // Why: ProseMirror selection coordinates can be off-by-one at document boundaries depending on the schema/layout.
  // For E2E's Control+A path we only need a coarse "covers whole doc" signal to choose a safe fallback.
  return from <= 1 && to >= maxPos - 1;
}

/**
 * Why: We need a deterministic snapshot for AI diff preview/apply. If the user didn't select a range, we treat the whole
 * document as the scope (still deterministic) so Review Mode can be applied safely.
 */
function captureSelectionFromEditor(args: {
  filePath: string;
  editor: Editor;
  selection: EditorSelectionSnapshot | null;
}): EditorSelectionSnapshot {
  const { filePath, editor, selection } = args;

  // Prefer the SSOT selection snapshot when it matches the active file.
  if (selection && selection.filePath === filePath && selection.from !== selection.to) {
    return { ...selection };
  }

  const { from, to } = editor.state.selection;
  const doc = editor.state.doc;

  if (from !== to) {
    return {
      filePath,
      from,
      to,
      text: doc.textBetween(from, to, '\n'),
      updatedAt: Date.now(),
    };
  }

  const scopeFrom = 0;
  const scopeTo = doc.content.size;
  return {
    filePath,
    from: scopeFrom,
    to: scopeTo,
    text: doc.textBetween(scopeFrom, scopeTo, '\n'),
    updatedAt: Date.now(),
  };
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
  const setLastError = useAIStore((s) => s.setLastError);

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

    wnPerfMark('wm.ai.cancel.request');
    try {
      await aiClient.cancel({ runId });
    } catch (error) {
      console.warn('[AI] cancel failed:', error);
      // Why: Cancellation is best-effort; we still clear pending state to avoid UI deadlocks.
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      cancelRunLocal();
      setDiff(null);
      if (activeEditor) {
        activeEditor.commands.clearAiDiff();
      }
      setStatusBarAIStatus('idle', '');
      wnPerfMark('wm.ai.cancel.cleared');
      wnPerfMeasure('wm.ai.cancel', 'wm.ai.cancel.request', 'wm.ai.cancel.cleared');
    }
  }, [activeEditor, cancelRunLocal, setDiff, setStatusBarAIStatus]);

  const rejectDiff = useCallback(async () => {
    const editor = useEditorRuntimeStore.getState().activeEditor;
    if (editor) {
      editor.commands.rejectAiDiff();
    }
    setDiff(null);
    setLastError(null);
  }, [setDiff, setLastError]);

  const acceptDiff = useCallback(async () => {
    const state = useAIStore.getState();
    const diff = state.diff;
    if (!diff) return;

    const editor = useEditorRuntimeStore.getState().activeEditor;
    const filePath = diff.selection?.filePath ?? useEditorRuntimeStore.getState().activeFilePath;
    if (!editor || !filePath) {
      setLastError({ code: 'INTERNAL', message: 'No active editor for applying AI diff' });
      return;
    }

    const before = getMarkdownFromEditor(editor);
    const snapshot = diff.selection;

    const tryApplyFullDocumentFallback = (): boolean => {
      if (!snapshot) return false;
      if (!isFullDocumentSelection(editor, snapshot)) return false;
      const maxPos = editor.state.doc.content.size;
      const current = normalizeAiSelectionText(getEditorTextBetween(editor, 0, maxPos));
      if (current !== normalizeAiSelectionText(diff.originalText)) return false;

      // Why: If the in-editor diff session was dropped (remount/external sync) but the document is unchanged,
      // we can safely apply a whole-document replacement for the Control+A path (used by E2E for determinism).
      editor.commands.clearAiDiff();
      editor.commands.setContent(diff.suggestedText, { emitUpdate: true, contentType: 'markdown' });
      return true;
    };

    let applied = editor.commands.acceptAiDiff();
    if (!applied) {
      if (!snapshot) {
        setLastError({ code: 'INTERNAL', message: 'Missing selection snapshot for applying AI diff' });
        return;
      }

      // Why: Some editor lifecycles can drop the in-editor diff session (e.g. re-mount or external content sync).
      // We re-create the preview session from the stored diff state so Accept remains deterministic.
      const previewed = editor.commands.showAiDiff({
        runId: diff.runId,
        originalText: diff.originalText,
        suggestedText: diff.suggestedText,
        selection: { from: snapshot.from, to: snapshot.to },
        createdAt: diff.createdAt,
      });
      if (!previewed) {
        if (!tryApplyFullDocumentFallback()) {
          setLastError({ code: 'CONFLICT', message: 'Selection changed; cannot apply AI diff safely' });
          return;
        }
        applied = true;
      }

      if (!applied) {
        applied = editor.commands.acceptAiDiff();
        if (!applied && !tryApplyFullDocumentFallback()) {
          setLastError({ code: 'INTERNAL', message: 'Failed to apply AI diff after re-syncing the preview session' });
          return;
        }
        applied = true;
      }
    }

    editor.commands.clearAiDiff();
    const after = getMarkdownFromEditor(editor);
    const reason = diff.skillId ? `ai:${diff.skillId}` : 'ai';

    // Why: Applying the diff is the user-visible action. Version snapshots are best-effort and must not block the UI.
    setDiff(null);
    setLastError(null);

    const persistSnapshot = async (name: string, content: string, actor: 'auto' | 'ai'): Promise<void> => {
      try {
        await withTimeout(
          invoke('version:create', { articleId: filePath, content, name, reason, actor }),
          10_000,
          { code: 'TIMEOUT', message: `version:create timed out (${name})` },
        );
      } catch (error) {
        setLastError(toIpcError(error));
      }
    };

    void (async () => {
      await persistSnapshot('Before AI', before, 'auto');
      await persistSnapshot('AI Apply', after, 'ai');
    })();
  }, [setDiff, setLastError]);

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

      if (!activeEditor || !activeFilePath) {
        failRun({ code: 'INVALID_ARGUMENT', message: '请先打开一个文档再运行 AI' });
        setStatusBarAIStatus('error', '未打开文档');
        return;
      }

      const selectionSnapshot = captureSelectionFromEditor({
        filePath: activeFilePath,
        editor: activeEditor,
        selection,
      });
      selectionSnapshotRef.current = selectionSnapshot;

      const sourceText = selectionSnapshot.text;

      if (!sourceText.trim()) {
        failRun({ code: 'INVALID_ARGUMENT', message: '请选择文本或输入内容后再试' });
        setStatusBarAIStatus('error', '内容为空');
        return;
      }

      sourceTextRef.current = sourceText;

      const instruction = value.trim();
      const userMessage = instruction || formatSkillLabel(skillId);
      addUserMessage(userMessage, skillId);
      const assistantId = ensureAssistantMessage(skillId);

      setDiff(null);
      setLastError(null);
      activeEditor.commands.clearAiDiff();
      setStatusBarAIStatus('thinking', 'AI 思考中…');

      try {
        const skillResp = await skillsClient.getSkill({ id: skillId });
        if (!skillResp.ok) throw new Error(skillResp.error.message);
        const definition = skillResp.data.skill.definition;
        if (!definition) throw new Error('Skill definition is unavailable');

        // Best-effort project context. If unavailable, we still run the skill.
        const project = await invokeSafe('project:getCurrent', {});
        const projectId = project?.projectId ?? undefined;
        const articleId = selectionSnapshot.filePath ?? undefined;

        const request = await assembleSkillRunRequest({
          skillId,
          definition,
          text: sourceText,
          instruction,
          selection: selectionSnapshot.from !== selectionSnapshot.to ? { from: selectionSnapshot.from, to: selectionSnapshot.to } : null,
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
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
            finishRun();
            setStatusBarAIStatus('idle', '');

            const originalText = sourceTextRef.current;
            const suggestedText = result;
            setMessageContent(assistantId, suggestedText);
            const hunks = computeDiff(originalText, suggestedText);
            const snapshot = selectionSnapshotRef.current;
            if (!snapshot) {
              setLastError({ code: 'INTERNAL', message: 'Missing selection snapshot for AI diff preview' });
              return;
            }

            const previewed = activeEditor.commands.showAiDiff({
              runId,
              originalText,
              suggestedText,
              selection: { from: snapshot.from, to: snapshot.to },
              createdAt: Date.now(),
            });
            if (!previewed) {
              // Why: The editor is the source of truth for safe application. If we can't preview safely, do not show
              // a Review UI that cannot be applied.
              return;
            }
            setDiff({
              runId,
              skillId,
              createdAt: Date.now(),
              originalText,
              suggestedText,
              accepted: hunks.map(() => true),
              selection: snapshot,
            });
          },
          (error) => {
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
            const code = typeof error.name === 'string' && error.name.trim() ? error.name.trim() : 'UPSTREAM_ERROR';

            if (code === 'CANCELED') {
              // Why: CANCELED is a first-class state; it must not be surfaced as an error or leave the UI stuck.
              cancelRunLocal();
              setStatusBarAIStatus('idle', '');
              setDiff(null);
              activeEditor.commands.clearAiDiff();
              return;
            }

            const ipc = toIpcError({ code, message: error.message });
            failRun(ipc);
            setStatusBarAIStatus('error', ipc.message);
            setDiff(null);
            activeEditor.commands.clearAiDiff();
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
      cancelRunLocal,
      failRun,
      finishRun,
      isReady,
      selectedSkillId,
      selection,
      setDiff,
      setLastError,
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
    acceptDiff,
    rejectDiff,
  };
}

export default useAISkill;
