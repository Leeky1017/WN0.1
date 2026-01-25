# P2-006: 实现双模式切换

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-006 |
| Phase | 2 - 编辑器 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P2-005 |

## 必读前置（执行前必须阅读）

- [x] `design/02-tech-stack.md` — **技术选型（禁止替换 TipTap）**
- [x] `spec.md` 编辑器 Requirement — 双模式切换需求

## 目标

实现富文本模式和 Markdown 模式的无缝切换，两种模式编辑同一文档，底层数据一致。

## 任务清单

- [x] 实现模式切换按钮/开关
- [x] 实现 Markdown 模式的语法快捷输入
- [x] 确保模式切换时内容和格式完全保持
- [x] 在设置中添加"默认编辑模式"选项
- [x] 保存用户的模式偏好

## 验收标准

- [x] 切换模式时文档内容和格式完全保持
- [x] 富文本模式下不显示 Markdown 语法
- [x] Markdown 模式下支持语法快捷输入
- [x] 用户可设置默认模式

## 产出

- `src/components/editor/ModeSwitch.tsx`
- `src/stores/editorModeStore.ts`
- 更新 `EditorToolbar.tsx`

## 技术细节

### 模式定义

```typescript
type EditorMode = 'richtext' | 'markdown';

interface EditorModeState {
  mode: EditorMode;
  defaultMode: EditorMode;
  setMode: (mode: EditorMode) => void;
  setDefaultMode: (mode: EditorMode) => void;
}
```

### 模式切换组件

```tsx
function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => onChange('richtext')}
        className={cn(
          'px-2 py-1 rounded',
          mode === 'richtext' && 'bg-[var(--bg-active)]'
        )}
      >
        富文本
      </button>
      <button
        onClick={() => onChange('markdown')}
        className={cn(
          'px-2 py-1 rounded',
          mode === 'markdown' && 'bg-[var(--bg-active)]'
        )}
      >
        Markdown
      </button>
    </div>
  );
}
```

### 模式行为差异

| 行为 | 富文本模式 | Markdown 模式 |
|------|-----------|---------------|
| 输入 `#` + 空格 | 显示 # 字符 | 转换为标题 |
| 输入 `**text**` | 显示 ** 字符 | 转换为粗体 |
| 工具栏 | 完整显示 | 可选显示 |
| 语法高亮 | 隐藏 | 可选显示 |

### TipTap 配置

```typescript
// 富文本模式：禁用 Markdown 快捷输入
const richTextExtensions = [
  StarterKit.configure({
    // 禁用 Markdown 语法转换
    typography: false,
  }),
];

// Markdown 模式：启用 Markdown 快捷输入
const markdownExtensions = [
  StarterKit,
  Typography,
  Markdown.configure({
    html: false,
    transformPastedText: true,
  }),
];
```

## 用户场景

### 场景 1：普通创作者

1. 打开应用，默认进入富文本模式
2. 使用工具栏完成所有格式化
3. 从不切换模式，无需了解 Markdown

### 场景 2：熟悉 Markdown 的用户

1. 在设置中将默认模式改为 Markdown
2. 使用语法快捷输入写作
3. 偶尔切换到富文本模式调整复杂格式

### 场景 3：混合使用

1. 用 Markdown 模式快速输入结构
2. 切换到富文本模式微调样式
3. 无缝切换，内容完全保持
