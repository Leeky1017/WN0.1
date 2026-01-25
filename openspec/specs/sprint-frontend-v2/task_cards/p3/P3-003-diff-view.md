# P3-003: 实现 Diff 视图

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P3-003 |
| Phase | 3 - AI 面板 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P3-001 |

## 必读前置（执行前必须阅读）

- [x] `design/01-design-tokens.md` — Design Tokens 规范
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现 AI 修改建议的 Diff 对比视图，支持接受/拒绝/部分接受。

## 任务清单

- [x] 实现 Diff 计算逻辑
- [x] 创建 Diff 视图组件（红色删除/绿色新增）
- [x] 实现一键接受功能
- [x] 实现一键拒绝功能
- [x] 实现部分接受功能（按块选择）
- [x] 实现 Diff 预览模式
- [x] 添加接受/拒绝快捷键

## 验收标准

- [x] Diff 对比清晰可读
- [x] 删除用红色、新增用绿色
- [x] 可以一键接受或拒绝
- [x] 可以部分接受修改

## 产出

- `src/features/ai-panel/components/DiffView.tsx`
- `src/features/ai-panel/components/DiffHunk.tsx`
- `src/lib/diff/diffUtils.ts`

## 技术细节

### Diff 计算

```typescript
// lib/diff/diffUtils.ts
import { diffWords, diffLines } from 'diff';

interface DiffHunk {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
}

export function computeDiff(original: string, modified: string): DiffHunk[] {
  const changes = diffLines(original, modified);
  return changes.map(change => ({
    type: change.added ? 'add' : change.removed ? 'remove' : 'unchanged',
    content: change.value,
  }));
}
```

### Diff 视图组件

```tsx
function DiffView({ original, modified, onAccept, onReject }: DiffViewProps) {
  const hunks = useMemo(() => computeDiff(original, modified), [original, modified]);
  
  return (
    <div className="border rounded-[var(--radius-md)] overflow-hidden">
      {/* Diff 内容 */}
      <div className="font-mono text-sm">
        {hunks.map((hunk, i) => (
          <DiffHunk key={i} hunk={hunk} />
        ))}
      </div>
      
      {/* 操作按钮 */}
      <div className="flex gap-2 p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        <Button variant="default" size="sm" onClick={onAccept}>
          <Check size={14} className="mr-1" />
          接受
        </Button>
        <Button variant="outline" size="sm" onClick={onReject}>
          <X size={14} className="mr-1" />
          拒绝
        </Button>
      </div>
    </div>
  );
}

function DiffHunk({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className={cn(
      'px-4 py-1',
      hunk.type === 'add' && 'bg-green-500/10 text-green-400',
      hunk.type === 'remove' && 'bg-red-500/10 text-red-400 line-through',
    )}>
      <span className="mr-2">
        {hunk.type === 'add' ? '+' : hunk.type === 'remove' ? '-' : ' '}
      </span>
      {hunk.content}
    </div>
  );
}
```
