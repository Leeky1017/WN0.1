# P5-001: 实现版本历史面板

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P5-001 |
| Phase | 5 - 辅助功能 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P4-003 |

## 必读前置（执行前必须阅读）

- [x] `design/04-rpc-client.md` — RPC 客户端设计
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现版本历史面板，支持查看、回退和对比版本。

## 任务清单

- [x] 创建版本历史面板组件
- [x] 调用后端 `version:list` 获取版本列表
- [x] 实现版本时间线展示
- [x] 实现版本预览
- [x] 实现版本回退（调用 `version:restore`）
- [x] 实现版本对比（调用 `version:diff`）
- [x] 实现版本命名

## 验收标准

- [x] 版本列表正确展示
- [x] 可以预览历史版本
- [x] 可以回退到任意版本
- [x] 可以对比两个版本

## 产出

- `src/features/version-history/VersionHistoryPanel.tsx`
- `src/features/version-history/VersionItem.tsx`
- `src/features/version-history/VersionDiff.tsx`

## 技术细节

### 版本列表

```tsx
function VersionHistoryPanel({ filePath }: { filePath: string }) {
  const { data: versions } = useInvoke('version:list', { path: filePath });
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <h3 className="font-semibold">版本历史</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {versions?.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isSelected={version.id === selectedVersion}
              onClick={() => setSelectedVersion(version.id)}
              onRestore={() => restoreVersion(version.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

### 版本项组件

```tsx
interface Version {
  id: string;
  name: string | null;
  reason: string;
  actor: 'user' | 'ai' | 'auto';
  createdAt: string;
}

function VersionItem({ version, isSelected, onClick, onRestore }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-[var(--radius-sm)] cursor-pointer mb-1',
        isSelected ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {version.name || formatTime(version.createdAt)}
        </span>
        <ActorBadge actor={version.actor} />
      </div>
      <div className="text-xs text-[var(--text-muted)] mt-1">
        {version.reason}
      </div>
      {isSelected && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={onRestore}>
            恢复此版本
          </Button>
          <Button size="sm" variant="ghost">
            对比
          </Button>
        </div>
      )}
    </div>
  );
}
```
