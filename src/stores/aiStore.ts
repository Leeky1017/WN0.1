import { create } from 'zustand';

import { IpcError, aiOps, versionOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { buildAiConversationMessages, saveAiConversation } from '../lib/context/conversation';
import { generateAndPersistConversationSummary } from '../lib/context/conversation-summary';
import { createJudge } from '../lib/judge';
import { useConstraintsStore } from './constraintsStore';
import { useEditorStore } from './editorStore';
import { useProjectsStore } from './projectsStore';

import type { AiStreamEvent } from '../types/ai';
import type { JudgeResult } from '../types/constraints';
import type { ArticleSnapshot } from '../types/models';

export type AiRunStatus = 'idle' | 'streaming' | 'done' | 'error' | 'canceled';

let judgeSeq = 0;

export type AiApplyTarget =
  | {
      kind: 'selection';
      start: number;
      end: number;
    }
  | { kind: 'document' };

export type AiRunState = {
  skillId: string;
  skillName: string;
  status: AiRunStatus;
  runId: string | null;
  target: AiApplyTarget;
  originalText: string;
  suggestedText: string;
  errorMessage: string | null;
  judge: {
    status: 'idle' | 'checking' | 'done' | 'error';
    result: JudgeResult | null;
    errorMessage: string | null;
  };
};

export type VersionListItem = Omit<ArticleSnapshot, 'content'>;

export type HistoryPreviewState = {
  snapshotId: string;
  title: string;
  snapshotContent: string;
};

type AiState = {
  run: AiRunState | null;
  versions: VersionListItem[];
  versionsLoading: boolean;
  versionsError: string | null;
  historyPreview: HistoryPreviewState | null;

  runSkill: (skill: { id: string; name: string }) => Promise<void>;
  cancelRun: () => Promise<void>;
  rejectSuggestion: () => Promise<void>;
  acceptSuggestion: () => Promise<void>;

  loadVersions: (articleId: string) => Promise<void>;
  previewSnapshot: (snapshotId: string) => Promise<void>;
  clearPreview: () => void;
  restorePreviewed: () => Promise<void>;

  handleStreamEvent: (event: AiStreamEvent) => void;
  checkRunConstraints: () => Promise<void>;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function clampRange(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > max) return max;
  return value;
}

export const useAiStore = create<AiState>((set, get) => ({
  run: null,
  versions: [],
  versionsLoading: false,
  versionsError: null,
  historyPreview: null,

  runSkill: async (skill) => {
    const skillId = typeof skill?.id === 'string' ? skill.id : '';
    const skillName = typeof skill?.name === 'string' ? skill.name : 'SKILL';
    if (!skillId) return;

    const editor = useEditorStore.getState();
    const articleId = editor.currentPath;
    const content = editor.content ?? '';

    if (!articleId) {
      set({
        run: {
          skillId,
          skillName,
          status: 'error',
          runId: null,
          target: { kind: 'document' },
          originalText: '',
          suggestedText: '',
          errorMessage: '请先选择一个文档',
          judge: { status: 'idle', result: null, errorMessage: null },
        },
        historyPreview: null,
      });
      return;
    }

    const selection = editor.selection;
    const safeStart = clampRange(selection?.start ?? 0, content.length);
    const safeEnd = clampRange(selection?.end ?? safeStart, content.length);
    const hasSelection = safeEnd > safeStart;

    const originalText = hasSelection ? content.slice(safeStart, safeEnd) : content;
    if (!originalText.trim()) {
      const target: AiApplyTarget = hasSelection ? { kind: 'selection', start: safeStart, end: safeEnd } : { kind: 'document' };
      set({
        run: {
          skillId,
          skillName,
          status: 'error',
          runId: null,
          target,
          originalText,
          suggestedText: '',
          errorMessage: '选区/正文为空',
          judge: { status: 'idle', result: null, errorMessage: null },
        },
        historyPreview: null,
      });
      return;
    }

    const target: AiApplyTarget = hasSelection ? { kind: 'selection', start: safeStart, end: safeEnd } : { kind: 'document' };

    set({
      run: {
        skillId,
        skillName,
        status: 'streaming',
        runId: null,
        target,
        originalText,
        suggestedText: '',
        errorMessage: null,
        judge: { status: 'idle', result: null, errorMessage: null },
      },
      historyPreview: null,
    });

    try {
      const res = await aiOps.runSkill({
        skillId,
        input: { text: originalText, language: 'zh-CN' },
        context: { articleId },
        stream: true,
      });
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              runId: res.runId,
            }
          : null,
      }));
    } catch (error) {
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              status: 'error',
              errorMessage: toErrorMessage(error),
            }
          : null,
      }));
    }
  },

  handleStreamEvent: (event) => {
    const currentRun = get().run;
    if (!currentRun) return;
    if (currentRun.runId && event.runId !== currentRun.runId) return;
    if (!currentRun.runId) {
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              runId: event.runId,
            }
          : null,
      }));
    }

    if (event.type === 'delta') {
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              suggestedText: state.run.suggestedText + event.text,
            }
          : null,
      }));
      return;
    }

    if (event.type === 'done') {
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              status: 'done',
              suggestedText: event.result.text,
              judge: { status: 'checking', result: null, errorMessage: null },
            }
          : null,
      }));
      get().checkRunConstraints().catch(() => undefined);
      return;
    }

    if (event.type === 'error') {
      const code = event.error.code;
      const isCanceled = code === 'CANCELED';
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              status: isCanceled ? 'canceled' : 'error',
              runId: null,
              suggestedText: '',
              errorMessage: isCanceled ? null : toUserMessage(code, event.error.message),
              judge: { status: 'idle', result: null, errorMessage: null },
            }
          : null,
      }));
    }
  },

  cancelRun: async () => {
    const run = get().run;
    if (!run?.runId) return;
    const runId = run.runId;

    set({ run: null, historyPreview: null });

    try {
      await aiOps.cancelSkill(runId);
    } catch {
      // ignore
    }
  },

  rejectSuggestion: async () => {
    const run = get().run;
    if (!run || run.status !== 'done') {
      set({ run: null, historyPreview: null });
      return;
    }

    const projectId = useProjectsStore.getState().currentProjectId;
    const articleId = useEditorStore.getState().currentPath;
    if (!projectId || !articleId) {
      set({ run: null, historyPreview: null });
      return;
    }

    try {
      const convoInput = {
        projectId,
        articleId,
        skillId: run.skillId,
        skillName: run.skillName,
        outcome: 'rejected',
        originalText: run.originalText,
        suggestedText: run.suggestedText,
      } as const;
      const index = await saveAiConversation(convoInput);
      const messages = buildAiConversationMessages(convoInput);
      void generateAndPersistConversationSummary({
        projectId,
        conversationId: index.id,
        articleId,
        skillId: run.skillId,
        skillName: run.skillName,
        outcome: 'rejected',
        originalText: run.originalText,
        suggestedText: run.suggestedText,
        messages,
      }).catch((error) => {
        console.warn('conversation summary generation failed', error);
      });
    } catch (error) {
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              status: 'done',
              errorMessage: `对话保存失败：${toErrorMessage(error)}`,
            }
          : null,
      }));
      return;
    }

    set({ run: null, historyPreview: null });
  },

  acceptSuggestion: async () => {
    const run = get().run;
    if (!run || run.status !== 'done') return;

    const editor = useEditorStore.getState();
    const articleId = editor.currentPath;
    if (!articleId) return;

    const suggested = run.suggestedText;
    if (!suggested.trim()) return;

    const projectId = useProjectsStore.getState().currentProjectId;
    if (projectId) {
      try {
        const convoInput = {
          projectId,
          articleId,
          skillId: run.skillId,
          skillName: run.skillName,
          outcome: 'accepted',
          originalText: run.originalText,
          suggestedText: suggested,
        } as const;
        const index = await saveAiConversation(convoInput);
        const messages = buildAiConversationMessages(convoInput);
        void generateAndPersistConversationSummary({
          projectId,
          conversationId: index.id,
          articleId,
          skillId: run.skillId,
          skillName: run.skillName,
          outcome: 'accepted',
          originalText: run.originalText,
          suggestedText: suggested,
          messages,
        }).catch((error) => {
          console.warn('conversation summary generation failed', error);
        });
      } catch (error) {
        set((state) => ({
          run: state.run
            ? {
                ...state.run,
                status: 'done',
                errorMessage: `对话保存失败：${toErrorMessage(error)}`,
              }
            : null,
        }));
        return;
      }
    }

    let nextContent = editor.content;

    if (run.target.kind === 'selection') {
      nextContent = useEditorStore.getState().replaceRange({ start: run.target.start, end: run.target.end }, suggested);
    } else {
      useEditorStore.getState().setContent(suggested);
      nextContent = suggested;
    }

    try {
      await versionOps.create({
        articleId,
        actor: 'ai',
        reason: `ai:${run.skillId}`,
        content: nextContent,
      });
    } catch {
      // version history is best-effort; editor content already updated
    }

    set({ run: null, historyPreview: null });
    await get().loadVersions(articleId);
  },

  loadVersions: async (articleId: string) => {
    const id = typeof articleId === 'string' ? articleId.trim() : '';
    if (!id) return;
    set({ versionsLoading: true, versionsError: null });
    try {
      const res = await versionOps.list({ articleId: id, limit: 50 });
      set({ versions: res.items, versionsLoading: false, versionsError: null });
    } catch (error) {
      set({ versionsLoading: false, versionsError: toErrorMessage(error) });
    }
  },

  previewSnapshot: async (snapshotId: string) => {
    const id = typeof snapshotId === 'string' ? snapshotId.trim() : '';
    if (!id) return;
    try {
      const restored = await versionOps.restore(id);
      set({
        historyPreview: {
          snapshotId: id,
          title: '回退预览',
          snapshotContent: restored.content,
        },
        run: null,
      });
    } catch (error) {
      set({ versionsError: toErrorMessage(error) });
    }
  },

  clearPreview: () => {
    set({ historyPreview: null });
  },

  restorePreviewed: async () => {
    const preview = get().historyPreview;
    if (!preview) return;

    const editor = useEditorStore.getState();
    const articleId = editor.currentPath;
    if (!articleId) return;

    useEditorStore.getState().setContent(preview.snapshotContent);
    try {
      await useEditorStore.getState().save();
    } catch {
      // user can retry via editor
    }

    set({ historyPreview: null });
    await get().loadVersions(articleId);
  },

  checkRunConstraints: async () => {
    const run = get().run;
    if (!run || run.status !== 'done') return;
    if (!run.suggestedText.trim()) return;

    const requestId = (judgeSeq += 1);
    const effective = useConstraintsStore.getState().getEffectiveScopeConfig();
    const judge = createJudge({ enableL2: effective.l2Enabled, timeoutMs: 3000 });

    try {
      const result = await judge.check(run.suggestedText, effective.rules);
      if (requestId !== judgeSeq) return;
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              judge: { status: 'done', result, errorMessage: null },
            }
          : null,
      }));
    } catch (error) {
      if (requestId !== judgeSeq) return;
      set((state) => ({
        run: state.run
          ? {
              ...state.run,
              judge: { status: 'error', result: null, errorMessage: toErrorMessage(error) },
            }
          : null,
      }));
    }
  },
}));
