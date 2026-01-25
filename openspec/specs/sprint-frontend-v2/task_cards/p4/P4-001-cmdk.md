# P4-001: 集成 cmdk 命令面板

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P4-001 |
| Phase | 4 - 命令面板与设置 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P3-004 |

## 必读前置（执行前必须阅读）

- [x] `design/02-tech-stack.md` — **技术选型（禁止替换 cmdk）**
- [x] `design/01-design-tokens.md` — Design Tokens 规范

## 目标

使用 cmdk 实现全局命令面板，支持模糊搜索和键盘导航。

## 任务清单

- [x] 安装 cmdk 依赖
- [x] 创建命令面板组件
- [x] 实现 Cmd+K 全局快捷键触发
- [x] 实现模糊搜索
- [x] 实现分组展示（文件/命令/SKILL）
- [x] 实现最近使用记录
- [x] 实现键盘导航
- [x] 调整样式符合 Design Tokens

## 验收标准

- [x] Cmd+K 打开命令面板
- [x] 搜索实时过滤
- [x] 结果分组展示
- [x] 键盘可完全操作

## 产出

- `src/features/command-palette/CommandPalette.tsx`
- `src/features/command-palette/useCommands.ts`
- `src/stores/commandPaletteStore.ts`

## 技术细节

### 命令面板实现

```tsx
import { Command } from 'cmdk';

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { recentFiles, commands, skills } = useCommands();
  
  // 全局快捷键
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setOpen(true);
  });
  
  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      className="fixed inset-0 z-50"
    >
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[640px] bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden">
        <Command.Input
          placeholder="搜索文件、命令或 SKILL..."
          className="w-full px-4 py-3 text-[var(--text-primary)] bg-transparent border-b border-[var(--border-subtle)] outline-none"
        />
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-[var(--text-muted)] text-center">
            没有找到结果
          </Command.Empty>
          
          {/* 最近文件 */}
          <Command.Group heading="最近文件">
            {recentFiles.map(file => (
              <Command.Item
                key={file.path}
                value={file.name}
                onSelect={() => openFile(file.path)}
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] cursor-pointer data-[selected]:bg-[var(--bg-hover)]"
              >
                <FileText size={16} className="text-[var(--text-muted)]" />
                <span>{file.name}</span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">{file.path}</span>
              </Command.Item>
            ))}
          </Command.Group>
          
          {/* 命令 */}
          <Command.Group heading="命令">
            {commands.map(cmd => (
              <Command.Item key={cmd.id} value={cmd.name} onSelect={cmd.action}>
                <cmd.icon size={16} />
                <span>{cmd.name}</span>
                <kbd className="ml-auto">{cmd.shortcut}</kbd>
              </Command.Item>
            ))}
          </Command.Group>
          
          {/* SKILL */}
          <Command.Group heading="SKILL">
            {skills.map(skill => (
              <Command.Item key={skill.id} value={skill.name} onSelect={() => runSkill(skill.id)}>
                <Sparkles size={16} />
                <span>{skill.name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
```
