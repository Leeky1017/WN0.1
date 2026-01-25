# P1-003: 实现 Status Bar

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-003 |
| Phase | 1 - 核心布局 |
| 优先级 | P1 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P1-001 |

## 必读前置（执行前必须阅读）

- [x] `design/01-design-tokens.md` — Design Tokens 规范
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现底部状态栏，显示字数统计、AI 状态、保存状态等信息。

## 任务清单

- [x] 创建 `components/layout/StatusBar.tsx`
- [x] 实现字数统计显示
- [x] 实现 AI 状态显示（空闲/思考中/流式输出）
- [x] 实现保存状态显示（已保存/保存中/未保存）
- [x] 实现光标位置显示（行:列）
- [x] 实现文档语言/格式显示

## 验收标准

- [x] 状态栏固定在底部
- [x] 字数实时更新
- [x] AI 状态正确反映
- [x] 保存状态正确反映

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
