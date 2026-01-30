# ISSUE-388

- Issue: #388
- Branch: task/388-p6-p7-components
- PR: https://github.com/Leeky1017/WN0.1/pull/389

## Plan

- 实现 Phase 6: FileTree 相关组件 (fileStore, FileTreeItem, FileTree, Sidebar 集成)
- 实现 Phase 7: 辅助功能组件 (commandStore, CommandPalette, versionStore, VersionItem, VersionHistoryPanel, ExportDialog)
- 验证 Toast 组件已存在且完整

## Runs

### 2026-01-30 实现 P6-P7 组件

#### P6-01: fileStore
- Command: `创建 writenow-ui/src/stores/fileStore.ts`
- Key output: Zustand store 管理文件树状态，对接 file:* IPC
- Evidence: `writenow-ui/src/stores/fileStore.ts`

#### P6-02: FileTreeItem
- Command: `创建 writenow-ui/src/features/file-tree/components/FileTreeItem.tsx`
- Key output: 文件/文件夹节点，支持展开/折叠、右键菜单、重命名
- Evidence: `writenow-ui/src/features/file-tree/components/FileTreeItem.tsx`

#### P6-03: FileTree
- Command: `创建 writenow-ui/src/features/file-tree/components/FileTree.tsx`
- Key output: 递归渲染文件树，排序、空状态处理
- Evidence: `writenow-ui/src/features/file-tree/components/FileTree.tsx`

#### P6-04: FileTree 集成
- Command: `修改 writenow-ui/src/features/editor/EditorPage.tsx`
- Key output: 在编辑器侧边栏中集成 FileTree 组件
- Evidence: `writenow-ui/src/features/editor/EditorPage.tsx`

#### P7-01: commandStore
- Command: `创建 writenow-ui/src/stores/commandStore.ts`
- Key output: 命令注册机制、搜索过滤、键盘导航
- Evidence: `writenow-ui/src/stores/commandStore.ts`

#### P7-02: CommandPalette
- Command: `创建 writenow-ui/src/features/command-palette/CommandPalette.tsx`
- Key output: Cmd+K 唤起、实时搜索、分类显示、快捷键提示
- Evidence: `writenow-ui/src/features/command-palette/CommandPalette.tsx`

#### P7-03: versionStore
- Command: `创建 writenow-ui/src/stores/versionStore.ts`
- Key output: 版本列表/创建/恢复/差异比较
- Evidence: `writenow-ui/src/stores/versionStore.ts`

#### P7-04: VersionItem
- Command: `创建 writenow-ui/src/features/version-history/components/VersionItem.tsx`
- Key output: 时间/描述/Actor 标签、恢复按钮
- Evidence: `writenow-ui/src/features/version-history/components/VersionItem.tsx`

#### P7-05: VersionHistoryPanel
- Command: `创建 writenow-ui/src/features/version-history/VersionHistoryPanel.tsx`
- Key output: 版本历史面板、手动保存、恢复功能
- Evidence: `writenow-ui/src/features/version-history/VersionHistoryPanel.tsx`

#### P7-06: ExportDialog
- Command: `创建 writenow-ui/src/features/export/ExportDialog.tsx`
- Key output: Markdown/DOCX/PDF 格式选择、文件名预览
- Evidence: `writenow-ui/src/features/export/ExportDialog.tsx`

#### P7-07: Toast (验证)
- Command: `验证 writenow-ui/src/components/primitives/Toast/Toast.tsx`
- Key output: 已存在，支持 default/success/error/warning 四种变体
- Evidence: `writenow-ui/src/components/primitives/Toast/Toast.tsx`

### Lint 验证
- Command: `ReadLints`
- Key output: No linter errors found
- Evidence: 所有新增文件无 ESLint 错误
