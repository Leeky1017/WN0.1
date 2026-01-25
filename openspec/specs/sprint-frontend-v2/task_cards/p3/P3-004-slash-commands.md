# P3-004: 实现斜杠命令

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P3-004 |
| Phase | 3 - AI 面板 |
| 优先级 | P1 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P3-002 |

## 必读前置（执行前必须阅读）

- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**
- [x] `spec.md` AI 面板 Requirement — 斜杠命令需求

## 目标

在 AI 面板输入框中实现斜杠命令（/polish, /expand 等）。

## 任务清单

- [x] 创建斜杠命令菜单组件
- [x] 实现 `/` 触发检测
- [x] 实现命令过滤和搜索
- [x] 显示 SKILL 列表
- [x] 实现键盘导航（上下选择、Enter 确认）
- [x] 选择命令后自动填入

## 验收标准

- [x] 输入 `/` 时显示命令菜单
- [x] 可以搜索命令
- [x] 键盘可导航选择
- [x] 选择后触发对应 SKILL

## 产出

- `src/features/ai-panel/components/SlashCommandMenu.tsx`
- `src/features/ai-panel/hooks/useSlashCommand.ts`

## 技术细节

### 斜杠命令 Hook

```typescript
// hooks/useSlashCommand.ts
interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

const COMMANDS: SlashCommand[] = [
  { id: 'polish', name: '/polish', description: '润色文本', icon: Sparkles },
  { id: 'expand', name: '/expand', description: '扩写段落', icon: ArrowUpRight },
  { id: 'shorten', name: '/shorten', description: '精简段落', icon: ArrowDownRight },
  { id: 'style', name: '/style', description: '改变风格', icon: Palette },
  { id: 'continue', name: '/continue', description: '续写内容', icon: PenLine },
];

export function useSlashCommand(input: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const query = useMemo(() => {
    if (!input.startsWith('/')) return '';
    return input.slice(1).toLowerCase();
  }, [input]);
  
  const filteredCommands = useMemo(() => {
    if (!query) return COMMANDS;
    return COMMANDS.filter(cmd => 
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.includes(query)
    );
  }, [query]);
  
  useEffect(() => {
    setIsOpen(input.startsWith('/'));
    setSelectedIndex(0);
  }, [input]);
  
  return { isOpen, filteredCommands, selectedIndex, setSelectedIndex };
}
```

### 菜单组件

```tsx
function SlashCommandMenu({ commands, selectedIndex, onSelect }: Props) {
  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-lg overflow-hidden">
      {commands.map((cmd, i) => (
        <button
          key={cmd.id}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm',
            i === selectedIndex && 'bg-[var(--bg-hover)]'
          )}
          onClick={() => onSelect(cmd)}
        >
          <cmd.icon size={16} className="text-[var(--text-muted)]" />
          <div className="flex-1 text-left">
            <div className="text-[var(--text-primary)]">{cmd.name}</div>
            <div className="text-[var(--text-muted)] text-xs">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
```
