# ISSUE-221

- Issue: #221
- Branch: task/221-phase1-hotfix
- PR: https://github.com/Leeky1017/WN0.1/pull/222

## Plan

- 修复 flexlayout-react 导入错误
- 修复 react-arborist 导入错误

## Runs

### 2026-01-25 Hotfix

- 问题: `ITabSetRenderValues` 和 `NodeRendererProps` 运行时导入失败
- 原因: 这些类型在 ESM 打包时没有正确导出
- 修复: 
  - AppLayout.tsx: 移除 `ITabSetRenderValues` 导入和 `renderTabSet` 函数
  - FileNode.tsx: 使用内联类型定义替代 `NodeRendererProps` 导入

- Command: `npx tsc --noEmit`
- Key output: TypeScript check passed
- Evidence: `writenow-frontend/src/components/layout/AppLayout.tsx`, `writenow-frontend/src/features/file-tree/FileNode.tsx`
