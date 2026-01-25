# P3-002: 重做 AI 面板 UI

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P3-002 |
| Phase | 3 - AI 面板 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P3-001 |

## 必读前置（执行前必须阅读）

- [ ] `design/01-design-tokens.md` — Design Tokens 规范
- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

完全重做 AI 面板 UI，达到 Cursor 风格的视觉和交互质量。

## 任务清单

- [ ] 设计 AI 面板布局（消息列表 + 输入区域）
- [ ] 实现消息气泡组件（用户/AI 不同样式）
- [ ] 实现流式输出打字机效果
- [ ] 实现输入框（支持多行、自动扩展）
- [ ] 实现发送按钮和快捷键
- [ ] 实现加载状态动画
- [ ] 实现错误状态展示

## 验收标准

- [ ] UI 达到 Cursor 风格
- [ ] 流式输出流畅
- [ ] 加载状态有动画
- [ ] 交互响应迅速

## 产出

- `src/features/ai-panel/components/MessageList.tsx`
- `src/features/ai-panel/components/MessageBubble.tsx`
- `src/features/ai-panel/components/AIInput.tsx`
- `src/features/ai-panel/components/ThinkingIndicator.tsx`

## 技术细节

### 面板布局

```tsx
function AIPanel() {
  const { messages, status, sendMessage } = useAIStore();
  
  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)]">
      {/* 消息列表 */}
      <ScrollArea className="flex-1 p-4">
        <MessageList messages={messages} />
        {status === 'thinking' && <ThinkingIndicator />}
      </ScrollArea>
      
      {/* 输入区域 */}
      <div className="border-t border-[var(--border-subtle)] p-4">
        <AIInput onSend={sendMessage} disabled={status !== 'idle'} />
      </div>
    </div>
  );
}
```

### 消息气泡

```tsx
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      'flex mb-4',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[80%] rounded-lg px-4 py-2',
        isUser 
          ? 'bg-[var(--accent)] text-white' 
          : 'bg-[var(--bg-input)] text-[var(--text-primary)]'
      )}>
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}
```

### 思考中指示器

```tsx
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
      <Loader2 className="animate-spin h-4 w-4" />
      <span>AI 正在思考...</span>
    </div>
  );
}
```
