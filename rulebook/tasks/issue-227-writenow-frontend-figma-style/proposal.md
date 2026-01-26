# Proposal: issue-227-writenow-frontend-figma-style

## Why
当前 `writenow-frontend/` 需要与 `figma参考/` 的视觉基线对齐（配色/布局/面板与工具栏样式），以便在不改变现有 RPC 与状态管理的前提下，获得一致的 Cursor/VS Code 风格体验。

## What Changes
- 对齐/补齐 `writenow-frontend` 的 Figma 样式实现：design tokens、顶栏/侧栏布局、AI 面板 SKILL 展示与编辑器工具栏外观。
- 所有改动限定为样式与布局结构（className/组件结构），不改变既有交互语义与数据流（RPC、stores、AI diff/应用逻辑等）。

## Impact
- Affected specs:
  - `rulebook/tasks/issue-227-writenow-frontend-figma-style/specs/writenow-frontend-figma-style/spec.md`
- Affected code:
  - `writenow-frontend/src/styles/*`
  - `writenow-frontend/src/components/layout/*`
  - `writenow-frontend/src/features/ai-panel/*`
  - `writenow-frontend/src/components/editor/*`
- Breaking change: NO
- User benefit: UI 视觉与布局统一、信息密度与可读性提升，同时保持现有功能完整可用。
