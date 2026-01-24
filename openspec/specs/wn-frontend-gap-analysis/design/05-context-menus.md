# Design: 右键菜单缺口

## 现状分析

前端几乎无自定义右键菜单，完全依赖 Theia/浏览器默认行为。

### 缺失功能

| 场景 | 当前状态 | 优先级 |
|------|---------|-------|
| 编辑器右键菜单 | 完全缺失 | P1 |
| 文件树右键菜单 | 仅 Theia 默认 | P1 |
| 文本选择右键菜单 | 完全缺失 | P1 |

## 设计方案

### 1. 编辑器右键菜单

菜单项：
- 剪切（Cmd+X）
- 复制（Cmd+C）
- 粘贴（Cmd+V）
- 分隔线
- 查找（Cmd+F）
- 替换（Cmd+H）
- 分隔线
- AI 解释
- AI 改写
- AI 翻译（子菜单）

### 2. 文本选择右键菜单

菜单项：
- 复制
- 剪切
- 分隔线
- AI 解释选中内容
- AI 改写选中内容
- AI 续写
- 分隔线
- 添加到术语表
- 标记为角色名

### 3. 文件树右键菜单

见 `03-file-management.md`

## 技术实现

- 使用 Theia MenuContribution 注册菜单
- 编辑器右键菜单通过 TipTap extension 实现
- AI 操作调用现有 IPC

## 文件变更预期

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Add | `writenow-core/src/browser/editor-context-menu.ts` |
