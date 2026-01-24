# Design: 编辑器功能缺口

## 现状分析

TipTap 编辑器仅启用 `StarterKit`，缺乏专业写作工具应有的功能。

### 已实现

- Markdown 渲染
- 基本格式化（通过快捷键）
- Tab 缩进

### 缺失功能

| 功能 | 后端支持 | 优先级 | 备注 |
|------|---------|-------|------|
| 查找/替换 | 无 | P0 | 基本编辑器功能 |
| 字数统计显示 | 有 `stats` IPC | P0 | 后端有，前端无显示 |
| 格式化工具栏 | 无 | P0 | 无可视化格式按钮 |
| 撤销/重做按钮 | 无 | P0 | 仅快捷键，无按钮 |
| 图片插入/管理 | 无 | P1 | TipTap 支持但未启用 |
| 表格编辑 | 无 | P1 | TipTap 支持但未启用 |
| 链接编辑器 | 无 | P1 | 无链接预览/编辑 UI |
| 代码块语法高亮 | 无 | P1 | 无高亮主题 |
| 全屏/专注模式 | 无 | P1 | 无沉浸式写作 |
| 大纲导航 | 有 `outlines` 表 | P1 | 后端有表，前端无 UI |
| 目录生成 | 无 | P2 | 无 TOC 功能 |
| 脚注 | 无 | P2 | 无脚注支持 |
| 拼写检查 | 无 | P2 | 无拼写检查 |

## 设计方案

### 1. 编辑器工具栏

位置：编辑器顶部，固定显示。

布局分组：
- 撤销/重做
- 文本格式（粗体、斜体、下划线、删除线）
- 标题级别、列表
- 插入（链接、图片、表格）
- 搜索
- 字数统计

按钮状态：反映当前选区格式。

### 2. 查找/替换面板

触发方式：
- Cmd+F：打开查找
- Cmd+H：打开替换

功能：
- 实时高亮匹配
- 上一个/下一个导航
- 全部替换
- 选项：区分大小写、全词匹配、正则表达式
- 显示匹配计数

### 3. 大纲导航面板

- 左侧边栏新 Widget
- 显示 H1-H6 标题树
- 点击跳转到对应位置
- 与 `outlines` 表同步

## 文件变更预期

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Add | `writenow-core/src/browser/editor-toolbar.tsx` |
| Add | `writenow-core/src/browser/find-replace-widget.tsx` |
| Add | `writenow-core/src/browser/outline-widget.tsx` |
| Update | `writenow-core/src/browser/style/editor.css` |
