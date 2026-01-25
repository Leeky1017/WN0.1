# P2-005: 实现富文本工具栏

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-005 |
| Phase | 2 - 编辑器 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P2-001 |

## 必读前置（执行前必须阅读）

- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换 TipTap）**
- [ ] `design/01-design-tokens.md` — Design Tokens 规范

## 目标

实现类似 Word/Notion 的可视化富文本工具栏，让不懂 Markdown 的普通创作者也能流畅完成所有格式化操作。

## 任务清单

- [ ] 创建固定顶部工具栏组件
- [ ] 实现字体样式按钮（加粗/斜体/下划线/删除线）
- [ ] 实现标题级别下拉选择（H1-H6 + 正文）
- [ ] 实现列表按钮（有序/无序/任务列表）
- [ ] 实现引用和代码块按钮
- [ ] 实现链接插入对话框
- [ ] 实现图片插入（本地上传/粘贴/拖拽）
- [ ] 实现表格插入和编辑
- [ ] 实现对齐方式按钮（左/中/右）
- [ ] 实现撤销/重做按钮

## 验收标准

- [ ] 普通用户无需了解 Markdown 即可完成所有格式化
- [ ] 工具栏按钮状态正确反映当前格式
- [ ] 所有操作支持键盘快捷键
- [ ] 工具栏样式符合 Design Tokens

## 产出

- `src/components/editor/EditorToolbar.tsx`
- `src/components/editor/toolbar/*.tsx`

## 技术细节

### 工具栏布局

```
┌─────────────────────────────────────────────────────────────────┐
│ [B] [I] [U] [S] | [H▼] | [•] [1.] [☐] | ["] [</>] | [🔗] [🖼] [⊞] │
└─────────────────────────────────────────────────────────────────┘
```

### 工具栏组件

```tsx
function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-[var(--border-subtle)]">
      {/* 文本样式 */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<Bold size={16} />}
          tooltip="加粗 (Ctrl+B)"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic size={16} />}
          tooltip="斜体 (Ctrl+I)"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        {/* ... */}
      </ToolbarGroup>
      
      <ToolbarSeparator />
      
      {/* 标题选择器 */}
      <HeadingSelector editor={editor} />
      
      <ToolbarSeparator />
      
      {/* 列表 */}
      <ToolbarGroup>
        <ToolbarButton
          icon={<List size={16} />}
          tooltip="无序列表"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        {/* ... */}
      </ToolbarGroup>
      
      {/* ... 更多工具 */}
    </div>
  );
}
```

### 标题选择器

```tsx
function HeadingSelector({ editor }: { editor: Editor }) {
  const options = [
    { value: 'paragraph', label: '正文' },
    { value: 'h1', label: '标题 1' },
    { value: 'h2', label: '标题 2' },
    { value: 'h3', label: '标题 3' },
    { value: 'h4', label: '标题 4' },
  ];
  
  const current = editor.isActive('heading', { level: 1 }) ? 'h1'
    : editor.isActive('heading', { level: 2 }) ? 'h2'
    : editor.isActive('heading', { level: 3 }) ? 'h3'
    : 'paragraph';
  
  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (value === 'paragraph') {
          editor.chain().focus().setParagraph().run();
        } else {
          const level = parseInt(value.slice(1));
          editor.chain().focus().toggleHeading({ level }).run();
        }
      }}
    >
      {options.map(opt => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </Select>
  );
}
```

## 设计参考

- **Notion**：简洁的悬浮工具栏 + 斜杠命令
- **Word**：完整的 Ribbon 工具栏
- **Google Docs**：紧凑的固定工具栏

WriteNow 采用 **Google Docs 风格**：紧凑的固定顶部工具栏，所有常用功能一目了然。
