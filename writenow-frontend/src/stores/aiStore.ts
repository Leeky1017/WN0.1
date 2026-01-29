/**
 * AI store
 * Why: Centralize AI panel state (messages, streaming status, diff preview) with predictable transitions.
 */

import { create } from 'zustand';

import type { IpcError, SkillListItem } from '@/types/ipc-generated';
import type { EditorSelectionSnapshot } from '@/stores/editorRuntimeStore';

export type AiMessageRole = 'user' | 'assistant';

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: number;
  skillId?: string;
}

export type AiRunStatus = 'idle' | 'thinking' | 'streaming' | 'canceled' | 'error';

/** AI interaction mode (Cursor-style). */
export type AiMode = 'agent' | 'plan' | 'ask';

/** AI model selection. */
export interface AiModelOption {
  id: string;
  name: string;
  provider: string;
}

/** Default models available. */
export const DEFAULT_MODELS: AiModelOption[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'local', name: '本地模型', provider: 'Local' },
];

export interface AiDiffState {
  runId: string;
  skillId: string;
  createdAt: number;
  originalText: string;
  suggestedText: string;
  /** Per-hunk accept mask (same order as computeDiff()). */
  accepted: boolean[];
  /** Selection snapshot captured when the AI run started. */
  selection: EditorSelectionSnapshot | null;
}

function createId(): string {
  const cryptoObj = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuid = cryptoObj?.randomUUID?.();
  if (uuid) return uuid;
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export interface AiState {
  skills: SkillListItem[];
  selectedSkillId: string | null;

  /** Current AI interaction mode (agent/plan/ask). */
  mode: AiMode;
  /** Selected model ID. */
  selectedModelId: string;
  /** Available models. */
  models: AiModelOption[];

  input: string;
  messages: AiMessage[];

  status: AiRunStatus;
  currentRunId: string | null;
  lastError: IpcError | null;

  diff: AiDiffState | null;

  setSkills: (skills: SkillListItem[]) => void;
  setSelectedSkillId: (id: string | null) => void;
  setMode: (mode: AiMode) => void;
  setSelectedModelId: (id: string) => void;
  setModels: (models: AiModelOption[]) => void;
  setInput: (value: string) => void;

  addUserMessage: (content: string, skillId?: string) => string;
  ensureAssistantMessage: (skillId?: string) => string;
  appendToMessage: (id: string, delta: string) => void;
  /** Why: Some AI backends send a final full text; we need a deterministic replace. */
  setMessageContent: (id: string, content: string) => void;

  startRun: (runId: string) => void;
  /** Why: Distinguish streaming from thinking for UI feedback/cancel behavior. */
  setStreaming: () => void;
  finishRun: () => void;
  failRun: (error: IpcError) => void;
  /** Why: Cancel must clear run state without marking an error. */
  cancelRun: () => void;
  resetError: () => void;
  /** Why: Surface non-run errors (connection/apply failures) in the panel. */
  setLastError: (error: IpcError | null) => void;
  /** Why: Allow UI to explicitly set status when streaming lifecycle changes. */
  setStatus: (status: AiRunStatus) => void;

  setDiff: (diff: AiDiffState | null) => void;
  reset: () => void;
}

export const useAIStore = create<AiState>((set, get) => ({
  skills: [],
  selectedSkillId: null,
  mode: 'agent',
  selectedModelId: 'gpt-4',
  models: DEFAULT_MODELS,
  input: '',
  messages: [],
  status: 'idle',
  currentRunId: null,
  lastError: null,
  diff: null,

  setSkills: (skills) => set({ skills }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setMode: (mode) => set({ mode }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setModels: (models) => set({ models }),
  setInput: (value) => set({ input: value }),

  addUserMessage: (content, skillId) => {
    const id = createId();
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'user', content, createdAt: Date.now(), ...(skillId ? { skillId } : {}) },
      ],
    }));
    return id;
  },

  ensureAssistantMessage: (skillId) => {
    const id = createId();
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'assistant', content: '', createdAt: Date.now(), ...(skillId ? { skillId } : {}) },
      ],
    }));
    return id;
  },

  appendToMessage: (id, delta) => {
    if (!delta) return;
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
    }));
  },

  setMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),

  startRun: (runId) => set({ status: 'thinking', currentRunId: runId, lastError: null }),
  setStreaming: () => set({ status: 'streaming' }),
  finishRun: () => set({ status: 'idle', currentRunId: null }),
  failRun: (error) => set({ status: 'error', currentRunId: null, lastError: error }),
  cancelRun: () => set({ status: 'canceled', currentRunId: null, lastError: null }),
  resetError: () => set({ lastError: null, status: 'idle' }),
  setLastError: (error) => set({ lastError: error }),
  setStatus: (status) => set({ status }),

  setDiff: (diff) => set({ diff }),

  reset: () =>
    set({
      input: '',
      messages: [],
      status: 'idle',
      currentRunId: null,
      lastError: null,
      diff: null,
      // keep skills/mode/model selection
      selectedSkillId: get().selectedSkillId,
      skills: get().skills,
      mode: get().mode,
      selectedModelId: get().selectedModelId,
      models: get().models,
    }),
}));
