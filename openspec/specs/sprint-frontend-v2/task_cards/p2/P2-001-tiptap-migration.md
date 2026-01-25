# P2-001: 迁移 TipTap 编辑器组件

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-001 |
| Phase | 2 - 编辑器 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P1-004 |

## 目标

复用现有 TipTap 编辑器组件，迁移到新前端。

## 任务清单

- [ ] 安装 TipTap 相关依赖
- [ ] 复制/迁移现有编辑器组件
- [ ] 配置 TipTap 扩展（Markdown、代码块、表格等）
- [ ] 实现文件打开功能（调用 `file:read`）
- [ ] 实现文件保存功能（调用 `file:write`）
- [ ] 调整编辑器样式以符合 Design Tokens
- [ ] 实现 Markdown 所见即所得模式

## 验收标准

- [ ] 可以打开 `.md` 文件
- [ ] 编辑内容实时渲染
- [ ] 可以保存文件
- [ ] Markdown 语法正确渲染

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
