# P2-001: 迁移 TipTap 编辑器组件

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-001 |
| Phase | 2 - 编辑器 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P1-004 |

## 必读前置（执行前必须阅读）

- [x] `design/02-tech-stack.md` — **技术选型（禁止替换 TipTap）**
- [x] `design/01-design-tokens.md` — Design Tokens 规范

## 目标

复用现有 TipTap 编辑器组件，迁移到新前端。

## 任务清单

- [x] 安装 TipTap 相关依赖
- [x] 复制/迁移现有编辑器组件
- [x] 配置 TipTap 扩展（Markdown、代码块、表格等）
- [x] 实现文件打开功能（调用 `file:read`）
- [x] 实现文件保存功能（调用 `file:write`）
- [x] 调整编辑器样式以符合 Design Tokens
- [x] 实现 Markdown 所见即所得模式

## 验收标准

- [x] 可以打开 `.md` 文件
- [x] 编辑内容实时渲染
- [x] 可以保存文件
- [x] Markdown 语法正确渲染

## 产出

- `src/components/editor/TipTapEditor.tsx`
- `src/components/editor/extensions/`
- `src/features/editor/useEditor.ts`

## 技术细节

### TipTap 配置

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Markdown from 'tiptap-markdown';

const editor = useEditor({
  extensions: [
    StarterKit,
    Markdown.configure({
      html: false,
      transformPastedText: true,
    }),
    // 其他扩展...
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    // 触发自动保存
    debouncedSave(editor.storage.markdown.getMarkdown());
  },
});
```

### 文件读写

```typescript
// 打开文件
async function openFile(path: string) {
  const result = await invoke('file:read', { path });
  editor.commands.setContent(result.content);
}

// 保存文件
async function saveFile(path: string, content: string) {
  await invoke('file:write', { path, content });
}
```
