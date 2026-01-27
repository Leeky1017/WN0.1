# Delta Spec: sprint-open-source-opt (Issue #291)

本任务卡实现并验收 `openspec/specs/sprint-open-source-opt/spec.md` 的以下增量：

- 编辑器 AI Diff（L80–98）

## Requirements

### R1. 编辑器 MUST 提供 AI Diff 的 ProseMirror 预览机制

- 编辑器侧 MUST 提供 ProseMirror `Plugin` + `DecorationSet` 来渲染 AI 改写的 diff 预览（新增/删除/替换差异可视）。
- 扩展 MUST 提供 commands：`showAiDiff` / `acceptAiDiff` / `rejectAiDiff`（以及 `clearAiDiff` 用于取消/超时清理）。

### R2. Accept/Reject 的失败语义明确且可恢复

- **WHEN** 用户执行 `acceptAiDiff`
- **THEN** 扩展 MUST 校验当前选区文本仍与 `originalText` 一致；若已漂移 MUST 返回 `CONFLICT` 且允许重试（不得 silent failure）。
- **WHEN** 用户执行 `rejectAiDiff` 或清理（取消/超时）
- **THEN** 扩展 MUST 清理所有临时 decorations，保证不会残留“幽灵高亮”。

## Non-goals (this issue)

- 本 Issue 不修改 `writenow-frontend/src/components/editor/TipTapEditor.tsx` 的集成点。
- 本 Issue 不接入 streaming delta 聚合与 AI 面板 UI（后续 Issue 处理）。
