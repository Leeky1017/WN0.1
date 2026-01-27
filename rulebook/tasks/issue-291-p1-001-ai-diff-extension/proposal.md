# Proposal: issue-291-p1-001-ai-diff-extension

## Why
当前前端仅有 `diffUtils.ts` 与 AI 面板侧的 diff 数据展示，缺少编辑器内部可复用的“diff 预览 + 可恢复应用”机制。
本任务先补齐 ProseMirror Plugin + DecorationSet + commands 的最小闭环，为后续把 streaming 产物映射到编辑器内、并保证 Accept/Reject 的失败语义与清理语义（无幽灵高亮）提供稳定基座。

## What Changes
- 新增 `writenow-frontend/src/lib/editor/extensions/ai-diff.ts`：
  - 定义 `AiDiffSession` 等数据模型与 `AiDiffPluginKey`。
  - 实现 ProseMirror `Plugin`：维护 session + `DecorationSet`，并在 transaction 中随 mapping 更新，避免位置漂移。
  - 实现 commands：`showAiDiff` / `acceptAiDiff` / `rejectAiDiff`（并补齐 `clearAiDiff` 用于取消/超时路径）。
  - `acceptAiDiff` 包含 selection snapshot 冲突检测（选区已变化时返回 `CONFLICT`），失败语义明确且可重试。

## Impact
- Affected specs:
  - `openspec/specs/sprint-open-source-opt/spec.md`（P1：编辑器 AI Diff/Suggestion）
  - `openspec/specs/sprint-open-source-opt/design/02-tiptap-ai-extension.md`
  - `openspec/specs/sprint-open-source-opt/task_cards/p1/P1-001-ai-diff-extension.md`
- Affected code:
  - `writenow-frontend/src/lib/editor/extensions/ai-diff.ts`（新增）
  - `rulebook/tasks/issue-291-p1-001-ai-diff-extension/*`
- Breaking change: NO（本 Issue 不改 `TipTapEditor` 集成点）
- User benefit: 为 AI 改写提供可视化 diff 的底层能力，降低误覆盖风险，并确保取消/失败后不残留临时高亮。
