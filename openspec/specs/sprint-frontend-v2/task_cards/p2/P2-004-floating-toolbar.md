# P2-004: 实现浮动工具栏

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-004 |
| Phase | 2 - 编辑器 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P2-001 |

## 目标

实现选中文字时显示的浮动工具栏，提供格式化操作。

## 任务清单

- [ ] 创建浮动工具栏组件
- [ ] 实现工具栏定位逻辑（跟随选区）
- [ ] 添加格式化按钮（加粗/斜体/下划线/删除线）
- [ ] 添加链接按钮
- [ ] 添加代码按钮
- [ ] 添加 AI 快捷按钮（润色/扩写等）
- [ ] 实现 Tooltip 提示

## 验收标准

- [ ] 选中文字时工具栏出现
- [ ] 点击按钮执行格式化
- [ ] 工具栏跟随选区位置
- [ ] 有 Tooltip 提示按钮功能

## 产出

- `src/components/editor/FloatingToolbar.tsx`
- `src/components/editor/ToolbarButton.tsx`

## 技术细节

### TipTap BubbleMenu

```tsx
import { BubbleMenu } from '@tiptap/react';

function FloatingToolbar({ editor }: { editor: Editor }) {
  if (!editor) return null;
  
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      className="flex bg-[var(--bg-panel)] rounded-[var(--radius-md)] shadow-lg border border-[var(--border-default)] p-1"
    >
      <ToolbarButton
        icon={<Bold size={14} />}
        tooltip="加粗 (Ctrl+B)"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic size={14} />}
        tooltip="斜体 (Ctrl+I)"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Separator orientation="vertical" />
      <ToolbarButton
        icon={<Sparkles size={14} />}
        tooltip="AI 润色"
        onClick={() => triggerAISkill('polish')}
      />
    </BubbleMenu>
  );
}
```

### 按钮组件

```tsx
interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  isActive?: boolean;
  onClick: () => void;
}

function ToolbarButton({ icon, tooltip, isActive, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        className={cn(
          'p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)]',
          isActive && 'bg-[var(--bg-active)] text-[var(--accent)]'
        )}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
```
