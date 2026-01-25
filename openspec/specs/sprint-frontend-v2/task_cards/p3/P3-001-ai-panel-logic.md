# P3-001: 迁移 AI 面板逻辑

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P3-001 |
| Phase | 3 - AI 面板 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P2-004 |

## 必读前置（执行前必须阅读）

- [ ] `design/04-rpc-client.md` — RPC 客户端与流式推送
- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

复用现有 AI 后端逻辑，迁移 AI 面板核心功能到新前端。

## 任务清单

- [ ] 创建 AI 面板容器组件
- [ ] 实现 AI 调用 Hook（`useAISkill`）
- [ ] 实现流式输出订阅
- [ ] 实现对话历史管理
- [ ] 实现取消功能（Esc 键）
- [ ] 实现上下文组装（选中文本 + 项目上下文）

## 验收标准

- [ ] 可以发送消息到 AI
- [ ] AI 响应流式显示
- [ ] 可以取消正在进行的请求
- [ ] 对话历史正确保存

## 产出

- `src/features/ai-panel/AIPanel.tsx`
- `src/features/ai-panel/useAISkill.ts`
- `src/stores/aiStore.ts`

## 技术细节

### AI Store

```typescript
// stores/aiStore.ts
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  skillId?: string;
}

interface AIState {
  messages: Message[];
  status: 'idle' | 'thinking' | 'streaming' | 'error';
  currentRunId: string | null;
  
  sendMessage: (content: string, selectedText?: string) => Promise<void>;
  cancelRun: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  status: 'idle',
  currentRunId: null,
  
  sendMessage: async (content, selectedText) => {
    const runId = nanoid();
    set({ status: 'thinking', currentRunId: runId });
    
    // 添加用户消息
    set(state => ({
      messages: [...state.messages, {
        id: nanoid(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }],
    }));
    
    // 调用 AI
    await invoke('ai:skill:run', {
      skillId: 'chat',
      context: { selectedText },
      userInput: content,
      runId,
    });
    
    // 流式输出由 onStreamEvent 处理
  },
  
  cancelRun: () => {
    const { currentRunId } = get();
    if (currentRunId) {
      invoke('ai:skill:cancel', { runId: currentRunId });
      set({ status: 'idle', currentRunId: null });
    }
  },
}));
```

### 流式输出订阅

```typescript
// 在 AI 面板初始化时订阅
useEffect(() => {
  const unsubscribe = subscribeToAiStream(
    runId,
    (delta) => {
      // 追加到当前消息
      updateLastMessage(m => m + delta);
      setStatus('streaming');
    },
    (result) => {
      setStatus('idle');
    },
    (error) => {
      setStatus('error');
      toast.error('AI 请求失败', { description: error.message });
    }
  );
  
  return unsubscribe;
}, [runId]);
```
