# P1-003: 实现 Status Bar

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-003 |
| Phase | 1 - 核心布局 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P1-001 |

## 目标

实现底部状态栏，显示字数统计、AI 状态、保存状态等信息。

## 任务清单

- [ ] 创建 `components/layout/StatusBar.tsx`
- [ ] 实现字数统计显示
- [ ] 实现 AI 状态显示（空闲/思考中/流式输出）
- [ ] 实现保存状态显示（已保存/保存中/未保存）
- [ ] 实现光标位置显示（行:列）
- [ ] 实现文档语言/格式显示

## 验收标准

- [ ] 状态栏固定在底部
- [ ] 字数实时更新
- [ ] AI 状态正确反映
- [ ] 保存状态正确反映

## 产出

- `src/components/layout/StatusBar.tsx`
- `src/stores/statusBarStore.ts`

## 技术细节

### 状态栏布局

```
┌─────────────────────────────────────────────────────────────┐
│  行 12, 列 45  │  1,234 字  │  Markdown  │  ● AI 思考中...  │
└─────────────────────────────────────────────────────────────┘
```

### 实现

```tsx
function StatusBar() {
  const { cursorPosition, wordCount } = useEditorStore();
  const { aiStatus } = useAIStore();
  const { saveStatus } = useFileStore();
  
  return (
    <div className="h-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-subtle)] flex items-center px-4 text-[var(--text-muted)] text-xs">
      <StatusItem>
        行 {cursorPosition.line}, 列 {cursorPosition.column}
      </StatusItem>
      <StatusItem>{wordCount.toLocaleString()} 字</StatusItem>
      <StatusItem>Markdown</StatusItem>
      <StatusItem className="ml-auto">
        <AIStatusIndicator status={aiStatus} />
      </StatusItem>
      <StatusItem>
        <SaveStatusIndicator status={saveStatus} />
      </StatusItem>
    </div>
  );
}
```
