# 任务 001: TipTap 编辑器安装和基础集成

## 目标

在渲染进程中接入 TipTap（ProseMirror）并替换当前占位编辑器，实现可编辑的正文区域与基础格式能力（标题、加粗、斜体、列表），为后续“双模式编辑/自动保存/AI 工具栏”提供可扩展的编辑器内核。

## 依赖

- 任务 005：Zustand 状态管理（至少具备：当前文档内容、脏状态、保存状态）
- （建议）任务 003：文件操作 IPC（用于打开文件/保存联调）

## 实现步骤

1. 安装 TipTap 依赖（建议最小集合）：
   - `@tiptap/react`
   - `@tiptap/starter-kit`
   - （为双模式做准备）`@tiptap/extension-markdown` 或等价 Markdown 转换方案
2. 按核心目录结构创建编辑器组件目录：
   - `src/components/Editor/index.tsx`
   - `src/components/Editor/Toolbar.tsx`
   - `src/components/Editor/extensions/`（预留扩展）
3. 在 `src/components/Editor/index.tsx` 内初始化 TipTap：
   - 使用 `useEditor` 创建 editor 实例
   - 配置 `StarterKit`（启用 headings/bold/italic/list 等）
   - 配置 placeholder（无内容时提示）
4. 与 Zustand 联动（最小闭环）：
   - 从 store 读取 `content` 并在打开文件/切换文件时设置到 TipTap
   - 监听 TipTap `onUpdate`，将编辑结果写回 store（作为自动保存的数据源）
5. 替换旧编辑器入口：
   - 将 `src/components/Editor.tsx` 的占位实现迁移/替换为 TipTap 版本（或改为 re-export 到新目录结构）
6. 基础工具栏：
   - 在 `Toolbar.tsx` 提供按钮：标题（H1/H2/H3）、加粗、斜体、无序/有序列表
   - 按钮状态与 TipTap selection 同步（active/disabled）
7. 键盘与系统体验：
   - 保留撤销/重做快捷键（TipTap/ProseMirror 默认）
   - 确认 Windows 下输入法、复制粘贴基础可用

## 新增/修改文件

- `package.json` - 新增 TipTap 依赖
- `src/components/Editor/index.tsx` - TipTap 编辑器主体
- `src/components/Editor/Toolbar.tsx` - 基础工具栏
- `src/components/Editor/extensions/*` - 扩展占位（按需新增）
- `src/components/Editor.tsx` - 替换/迁移占位编辑器（若保留旧入口）
- `src/App.tsx` - 接入新编辑器组件（若现有引用路径变化）

## 验收标准

- [ ] 项目可正常启动，编辑器区域由 TipTap 渲染（不再是 textarea/contentEditable 占位）
- [ ] 支持正文输入、换行、撤销/重做
- [ ] 工具栏可对选区执行：标题、加粗、斜体、无序/有序列表
- [ ] 编辑器内容变化会同步到 Zustand（用于后续保存/状态栏）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 405-421 行（TipTap 选型理由）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 577-591 行（技术栈）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 630-667 行（目录结构：Editor 组件/扩展/Toolbar、Zustand stores）
