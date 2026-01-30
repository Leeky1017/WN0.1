/**
 * AI Store
 *
 * Zustand store 管理 AI 面板状态：
 * - 消息列表
 * - 当前运行状态
 * - 模型选择
 * - 角色选择
 *
 * 对接 IPC 通道：
 * - ai:skill:run - 运行技能
 * - ai:skill:cancel - 取消运行
 * - skill:list - 获取技能列表
 *
 * @see DESIGN_SPEC.md 6.3 MessageBubble
 * @see src/types/ipc-generated.ts
 */
import { create } from 'zustand';

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant';

/**
 * 消息状态
 */
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'canceled';

/**
 * AI 消息
 */
export interface AIMessage {
  /** 唯一 ID */
  id: string;
  /** 角色（用户/助手） */
  role: MessageRole;
  /** 消息内容（Markdown 格式） */
  content: string;
  /** 消息状态 */
  status: MessageStatus;
  /** 创建时间 */
  createdAt: string;
  /** 关联的 runId（用于取消/反馈） */
  runId?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * AI 运行状态
 */
export type AIRunStatus = 'idle' | 'running' | 'streaming';

/**
 * 可用模型
 */
export interface AIModel {
  id: string;
  name: string;
  description?: string;
}

/**
 * 可用角色/技能
 */
export interface AIRole {
  id: string;
  name: string;
  description?: string;
}

/**
 * AI Store 状态
 */
export interface AIState {
  // 消息列表
  messages: AIMessage[];

  // 运行状态
  runStatus: AIRunStatus;
  currentRunId: string | null;

  // 模型与角色选择
  selectedModelId: string;
  selectedRoleId: string;
  availableModels: AIModel[];
  availableRoles: AIRole[];

  // 输入状态
  inputText: string;

  // 面板展开状态
  isExpanded: boolean;

  // Actions
  setInputText: (text: string) => void;
  clearInput: () => void;

  // 消息操作
  addMessage: (message: Omit<AIMessage, 'id' | 'createdAt'>) => string;
  updateMessage: (id: string, updates: Partial<AIMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;

  // 运行控制
  startRun: (runId: string) => void;
  streamContent: (runId: string, content: string) => void;
  completeRun: (runId: string, finalContent?: string) => void;
  cancelRun: () => void;
  errorRun: (runId: string, error: string) => void;

  // 模型/角色选择
  setSelectedModel: (modelId: string) => void;
  setSelectedRole: (roleId: string) => void;
  setAvailableModels: (models: AIModel[]) => void;
  setAvailableRoles: (roles: AIRole[]) => void;

  // 面板控制
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;

  // 发送消息（主操作）
  sendMessage: (text: string) => Promise<void>;

  // 重置
  reset: () => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 默认可用模型
 */
const DEFAULT_MODELS: AIModel[] = [
  { id: 'gpt-4', name: 'GPT-4', description: '最强大的模型' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5', description: '快速响应' },
  { id: 'claude-3', name: 'Claude 3', description: '高质量输出' },
];

/**
 * 默认可用角色
 */
const DEFAULT_ROLES: AIRole[] = [
  { id: 'writer', name: '写作助手', description: '帮助创作和润色' },
  { id: 'editor', name: '编辑助手', description: '检查和修改' },
  { id: 'researcher', name: '研究助手', description: '查找和整理资料' },
];

const initialState = {
  messages: [] as AIMessage[],
  runStatus: 'idle' as AIRunStatus,
  currentRunId: null as string | null,
  selectedModelId: 'gpt-4',
  selectedRoleId: 'writer',
  availableModels: DEFAULT_MODELS,
  availableRoles: DEFAULT_ROLES,
  inputText: '',
  isExpanded: true,
};

export const useAIStore = create<AIState>()((set, get) => ({
  ...initialState,

  setInputText: (text) => set({ inputText: text }),

  clearInput: () => set({ inputText: '' }),

  addMessage: (message) => {
    const id = generateId();
    const newMessage: AIMessage = {
      ...message,
      id,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },

  clearMessages: () => set({ messages: [] }),

  startRun: (runId) => {
    set({
      runStatus: 'streaming',
      currentRunId: runId,
    });
  },

  streamContent: (runId, content) => {
    const { currentRunId, messages } = get();
    if (currentRunId !== runId) return;

    // 找到对应的 assistant 消息并更新内容
    const assistantMsg = messages.find(
      (m) => m.runId === runId && m.role === 'assistant'
    );
    if (assistantMsg) {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: msg.content + content, status: 'streaming' }
            : msg
        ),
      }));
    }
  },

  completeRun: (runId, finalContent) => {
    const { currentRunId, messages } = get();
    if (currentRunId !== runId) return;

    // 更新 assistant 消息状态
    const assistantMsg = messages.find(
      (m) => m.runId === runId && m.role === 'assistant'
    );
    if (assistantMsg) {
      set((state) => ({
        runStatus: 'idle',
        currentRunId: null,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsg.id
            ? {
                ...msg,
                content: finalContent ?? msg.content,
                status: 'complete',
              }
            : msg
        ),
      }));
    } else {
      set({
        runStatus: 'idle',
        currentRunId: null,
      });
    }
  },

  cancelRun: () => {
    const { currentRunId, messages } = get();
    if (!currentRunId) return;

    // 更新 assistant 消息状态为 canceled
    const assistantMsg = messages.find(
      (m) => m.runId === currentRunId && m.role === 'assistant'
    );
    if (assistantMsg) {
      set((state) => ({
        runStatus: 'idle',
        currentRunId: null,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsg.id ? { ...msg, status: 'canceled' } : msg
        ),
      }));
    } else {
      set({
        runStatus: 'idle',
        currentRunId: null,
      });
    }

    // TODO: 调用 window.api.invoke('ai:skill:cancel', { runId: currentRunId })
  },

  errorRun: (runId, error) => {
    const { currentRunId, messages } = get();
    if (currentRunId !== runId) return;

    const assistantMsg = messages.find(
      (m) => m.runId === runId && m.role === 'assistant'
    );
    if (assistantMsg) {
      set((state) => ({
        runStatus: 'idle',
        currentRunId: null,
        messages: state.messages.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, status: 'error', error }
            : msg
        ),
      }));
    } else {
      set({
        runStatus: 'idle',
        currentRunId: null,
      });
    }
  },

  setSelectedModel: (modelId) => set({ selectedModelId: modelId }),

  setSelectedRole: (roleId) => set({ selectedRoleId: roleId }),

  setAvailableModels: (models) => set({ availableModels: models }),

  setAvailableRoles: (roles) => set({ availableRoles: roles }),

  setExpanded: (expanded) => set({ isExpanded: expanded }),

  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

  /**
   * 发送消息
   *
   * 主要操作流程：
   * 1. 添加用户消息
   * 2. 添加助手消息（pending 状态）
   * 3. 调用 ai:skill:run IPC
   * 4. 处理流式响应
   * 5. 完成或错误处理
   */
  sendMessage: async (text) => {
    const { addMessage, startRun, streamContent, completeRun, errorRun } = get();

    if (!text.trim()) return;

    // 1. 添加用户消息
    addMessage({
      role: 'user',
      content: text,
      status: 'complete',
    });

    // 清空输入框
    set({ inputText: '' });

    // 2. 生成 runId 并添加助手消息
    const runId = `run_${Date.now()}`;
    addMessage({
      role: 'assistant',
      content: '',
      status: 'pending',
      runId,
    });

    // 3. 开始运行
    startRun(runId);

    try {
      // TODO: 真实对接 IPC
      // const response = await window.api.invoke('ai:skill:run', {
      //   skillId: selectedRoleId,
      //   input: { text },
      //   stream: true,
      //   prompt: { systemPrompt: '', userContent: text },
      // });

      // 模拟流式响应
      const mockResponse = `我理解你想要讨论「${text}」。

这是一个很有趣的话题！让我来帮你分析：

1. **首先**，我们需要考虑核心问题
2. **其次**，探索可能的解决方案
3. **最后**，制定行动计划

以下是一些示例代码：

\`\`\`typescript
function example() {
  console.log("Hello, WriteNow!");
  return true;
}
\`\`\`

希望这能帮助到你！如果需要更多细节，请告诉我。`;

      // 模拟流式输出
      const chunks = mockResponse.split('');
      for (const chunk of chunks) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        streamContent(runId, chunk);
      }

      // 4. 完成
      completeRun(runId);
    } catch (error) {
      // 5. 错误处理
      errorRun(runId, error instanceof Error ? error.message : 'Unknown error');
    }
  },

  reset: () => set(initialState),
}));

/**
 * 获取最后一条消息
 */
export function useLastMessage(): AIMessage | undefined {
  return useAIStore((state) => state.messages[state.messages.length - 1]);
}

/**
 * 判断是否正在运行
 */
export function useIsRunning(): boolean {
  return useAIStore((state) => state.runStatus !== 'idle');
}
