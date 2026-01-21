import { create } from 'zustand';

import { IpcError, aiOps, memoryOps, projectOps, versionOps } from '../lib/ipc';
import { toUserMessage } from '../lib/errors';
import { ContextAssembler } from '../lib/context/ContextAssembler';
import type { TokenBudget } from '../lib/context/TokenBudgetManager';
import type { PromptTemplateSkill } from '../lib/context/prompt-template';
import { BUILTIN_SKILLS, type SkillDefinition } from '../lib/skills';
import { buildAiConversationMessages, saveAiConversation } from '../lib/context/conversation';
import { generateAndPersistConversationSummary } from '../lib/context/conversation-summary';
import { createJudge } from '../lib/judge';
import { useConstraintsStore } from './constraintsStore';
import { useEditorStore } from './editorStore';
import { useEditorContextStore } from './editorContextStore';
import { useProjectsStore } from './projectsStore';

import type { AiStreamEvent } from '../types/ai';
import type { JudgeResult } from '../types/constraints';
import type { ArticleSnapshot } from '../types/models';
import type { AssembleResult, ContextFragmentInput, EditorContext } from '../types/context';
import type { ContextDebugState } from '../types/context-debug';
import type { UserMemory } from '../types/ipc';

export type AiRunStatus = 'idle' | 'streaming' | 'done' | 'error' | 'canceled';

let judgeSeq = 0;
let runSeq = 0;

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
  localId: number;
  injectedMemory: UserMemory[];
  sentPrompt: {
    prefixHash: string | null;
    promptHash: string | null;
  };
  target: AiApplyTarget;
  originalText: string;
  suggestedText: string;
  errorMessage: string | null;
  contextDebug: ContextDebugState | null;
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

function fnv1a32Hex(text: string): string {
  const raw = typeof text === 'string' ? text : '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Builds Retrieved fragments from injected memory items.
 * Why: memory injection must be part of ContextAssembler input so Context Viewer equals the actual model prompt.
 */
function buildInjectedMemoryFragments(items: UserMemory[]): ContextFragmentInput[] {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];

  const lines: string[] = [];
  lines.push('Injected user memory (ordered, minimal):');

  for (const item of list) {
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    if (!content) continue;
    const type = item.type;
    const scope = item.projectId ? 'project' : 'global';
    const origin = item.origin;
    lines.push(`- [${type}/${scope}/${origin}] ${content}`);
  }

  if (lines.length === 1) return [];

  return [
    {
      id: 'retrieved:memory:user-memory',
      layer: 'retrieved',
      source: { kind: 'module', id: 'memory:user-memory' },
      content: lines.join('\n'),
      priority: 80,
      meta: { itemCount: lines.length - 1 },
    },
  ];
}

/**
 * Resolves a usable `projectId` for context assembly even during early app boot.
 * Why: users can trigger SKILL before the Projects store finishes bootstrapping; context debug should still be available.
 */
async function resolveProjectId(): Promise<string | null> {
  const fromStore = useProjectsStore.getState().currentProjectId;
  if (fromStore) return fromStore;

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await useProjectsStore.getState().bootstrap().catch(() => undefined);
    const afterBootstrap = useProjectsStore.getState().currentProjectId;
    if (afterBootstrap) return afterBootstrap;

    try {
      const current = await projectOps.getCurrent();
      if (current.projectId) return current.projectId;
    } catch {
      // ignore and retry
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return null;
}

/**
 * Extracts the first paragraph from a skill template.
 * Why: keep `userInstruction` short and stable so the prompt template stays readable/debuggable without duplicating the entire legacy template.
 */
function firstParagraph(template: string): string {
  const raw = typeof template === 'string' ? template : '';
  const normalized = raw.replaceAll('\r\n', '\n').trim();
  if (!normalized) return '';
  const parts = normalized.split(/\n{2,}/g);
  return (parts[0] ?? '').trim();
}

/**
 * Maps the built-in skill definition into the PromptTemplateSystem contract.
 * Why: ContextAssembler expects a normalized, versioned skill payload to keep the system prompt stable for KV-cache.
 */
function toPromptTemplateSkill(def: SkillDefinition): PromptTemplateSkill {
  const constraints: string[] = [];
  if (def.outputConstraints.outputOnlyRewrittenText) constraints.push('Output ONLY rewritten text');
  if (def.outputConstraints.forbidExplanations) constraints.push('No explanations');
  if (def.outputConstraints.forbidCodeBlock) constraints.push('No code blocks');

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    systemPrompt: def.systemPrompt,
    outputConstraints: constraints,
    outputFormat: 'plain text',
  };
}

/**
 * Produces a safe EditorContext for context assembly.
 * Why: even when the user runs a skill on the whole document (no selection), we must still provide a required target text for the Immediate layer.
 */
function getEffectiveEditorContext(originalText: string): EditorContext {
  const current = useEditorContextStore.getState().context;
  if (current) {
    return {
      ...current,
      selectedText: originalText.trim() ? originalText : current.selectedText,
    };
  }

  return {
    selectedText: originalText,
    cursorLine: 1,
    cursorColumn: 1,
    currentParagraph: '',
    surroundingParagraphs: { before: [], after: [] },
    detectedEntities: [],
  };
}

/**
 * Default budget tuned for debugging and determinism.
 * Why: keep context assembly fast and predictable; trimming evidence is surfaced in UI when budgets are exceeded.
 */
const DEFAULT_CONTEXT_BUDGET: TokenBudget = {
  totalLimit: 8_000,
  layerBudgets: {
    rules: 3_000,
    settings: 3_000,
    retrieved: 3_000,
    immediate: 3_000,
  },
};

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
    const activeId = editor.activeTabId;
    const activeTab = activeId ? editor.tabStateById[activeId] : null;
    const articleId = activeTab?.path ?? null;
    const content = activeTab?.content ?? '';

    if (!articleId) {
      const localId = (runSeq += 1);
      set({
        run: {
          skillId,
          skillName,
          status: 'error',
          runId: null,
          localId,
          injectedMemory: [],
          sentPrompt: { prefixHash: null, promptHash: null },
          target: { kind: 'document' },
          originalText: '',
          suggestedText: '',
          errorMessage: '请先选择一个文档',
          contextDebug: null,
          judge: { status: 'idle', result: null, errorMessage: null },
        },
        historyPreview: null,
      });
      return;
    }

    const selection = activeTab?.selection;
    const safeStart = clampRange(selection?.start ?? 0, content.length);
    const safeEnd = clampRange(selection?.end ?? safeStart, content.length);
    const hasSelection = safeEnd > safeStart;

    const originalText = hasSelection ? content.slice(safeStart, safeEnd) : content;
    if (!originalText.trim()) {
      const target: AiApplyTarget = hasSelection ? { kind: 'selection', start: safeStart, end: safeEnd } : { kind: 'document' };
      const localId = (runSeq += 1);
      set({
        run: {
          skillId,
          skillName,
          status: 'error',
          runId: null,
          localId,
          injectedMemory: [],
          sentPrompt: { prefixHash: null, promptHash: null },
          target,
          originalText,
          suggestedText: '',
          errorMessage: '选区/正文为空',
          contextDebug: null,
          judge: { status: 'idle', result: null, errorMessage: null },
        },
        historyPreview: null,
      });
      return;
    }

    const target: AiApplyTarget = hasSelection ? { kind: 'selection', start: safeStart, end: safeEnd } : { kind: 'document' };

    const localId = (runSeq += 1);

    set({
      run: {
        skillId,
        skillName,
        status: 'streaming',
        runId: null,
        localId,
        injectedMemory: [],
        sentPrompt: { prefixHash: null, promptHash: null },
        target,
        originalText,
        suggestedText: '',
        errorMessage: null,
        contextDebug: { status: 'assembling', assembled: null, errorMessage: null },
        judge: { status: 'idle', result: null, errorMessage: null },
      },
      historyPreview: null,
    });

    try {
      const isCurrent = () => get().run?.localId === localId;
      const projectId = await resolveProjectId();
      const builtin = BUILTIN_SKILLS.find((s) => s.id === skillId) ?? null;
      if (!isCurrent()) return;
      if (!projectId) {
        set((state) => ({
          run:
            state.run && state.run.localId === localId
              ? {
                  ...state.run,
                  status: 'error',
                  errorMessage: '上下文组装失败：项目未就绪',
                  contextDebug: { status: 'error', assembled: null, errorMessage: 'Context assemble failed: project is not ready' },
                }
              : state.run,
        }));
        return;
      }

      if (!builtin) {
        set((state) => ({
          run:
            state.run && state.run.localId === localId
              ? {
                  ...state.run,
                  status: 'error',
                  errorMessage: '上下文组装失败：未找到 SKILL 定义',
                  contextDebug: { status: 'error', assembled: null, errorMessage: 'Context assemble failed: skill definition not found' },
                }
              : state.run,
        }));
        return;
      }

      let injectedMemory: UserMemory[] = [];
      try {
        const preview = await memoryOps.previewInjection({ projectId });
        injectedMemory = preview.injected?.memory ?? [];
      } catch (error) {
        injectedMemory = [];
        set((state) => ({
          run:
            state.run && state.run.localId === localId
              ? { ...state.run, injectedMemory: [], errorMessage: `记忆注入预览失败：${toErrorMessage(error)}` }
              : state.run,
        }));
      }

      if (!isCurrent()) return;

      const settingsPrefetch = useEditorContextStore.getState().settingsPrefetch;
      const settings =
        settingsPrefetch.status === 'ready'
          ? {
              characters: settingsPrefetch.resolved.characters,
              settings: settingsPrefetch.resolved.settings,
            }
          : undefined;

      const assembler = new ContextAssembler();
      const assembled: AssembleResult = await assembler.assemble({
        projectId,
        articleId,
        model: builtin.model,
        budget: DEFAULT_CONTEXT_BUDGET,
        skill: toPromptTemplateSkill(builtin),
        editorContext: getEffectiveEditorContext(originalText),
        userInstruction: firstParagraph(builtin.userPromptTemplate) || builtin.name,
        retrieved: buildInjectedMemoryFragments(injectedMemory),
        ...(settings ? { settings } : {}),
      });

      if (!isCurrent()) return;

      set((state) => ({
        run: state.run && state.run.localId === localId ? { ...state.run, contextDebug: { status: 'ready', assembled, errorMessage: null } } : state.run,
      }));

      const res = await aiOps.runSkill({
        skillId,
        input: { text: originalText, language: 'zh-CN' },
        context: { articleId, projectId },
        stream: true,
        prompt: { systemPrompt: assembled.systemPrompt, userContent: assembled.userContent },
        injected: { memory: injectedMemory },
      });

      const expectedPromptHash = fnv1a32Hex(`${assembled.systemPrompt}\n\n---\n\n${assembled.userContent}`);

      set((state) => ({
        run:
          state.run && state.run.localId === localId
            ? {
                ...state.run,
                runId: res.runId,
                injectedMemory: res.injected?.memory ?? injectedMemory,
                sentPrompt: { prefixHash: res.prompt?.prefixHash ?? null, promptHash: res.prompt?.promptHash ?? null },
                errorMessage:
                  res.prompt?.promptHash && res.prompt.promptHash !== expectedPromptHash
                    ? `⚠️ Prompt mismatch: viewer=${expectedPromptHash} sent=${res.prompt.promptHash}`
                    : state.run.errorMessage,
              }
            : state.run,
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
    if (!run) return;
    const runId = run.runId;

    set({ run: null, historyPreview: null });

    if (!runId) return;
    try {
      await aiOps.cancelSkill(runId);
    } catch (error) {
      console.warn('cancel ai run failed', error);
    }
  },

  rejectSuggestion: async () => {
    const run = get().run;
    if (!run || run.status !== 'done') {
      set({ run: null, historyPreview: null });
      return;
    }

    const projectId = useProjectsStore.getState().currentProjectId;
    const editor = useEditorStore.getState();
    const activeId = editor.activeTabId;
    const articleId = activeId ? editor.tabStateById[activeId]?.path ?? null : null;
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
    const activeId = editor.activeTabId;
    const activeTab = activeId ? editor.tabStateById[activeId] : null;
    const articleId = activeTab?.path ?? null;
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

    let nextContent = activeTab?.content ?? '';

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
    const activeId = editor.activeTabId;
    const articleId = activeId ? editor.tabStateById[activeId]?.path ?? null : null;
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
