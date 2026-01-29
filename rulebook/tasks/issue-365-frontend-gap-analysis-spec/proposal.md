# Proposal: issue-365-frontend-gap-analysis-spec

## Why

- `writenow-frontend/` 已具备 Write Mode SSOT 主路径，但仍存在大量“后端已实现、前端无入口/只读/不可发现”的能力差距（知识图谱、人物管理、约束/Judge、上下文调试、对话记录等），直接削弱 WriteNow 的产品差异化与可用性。
- 当前需要把这份差距分析从 Plan 形式固化为 **OpenSpec 可执行规范**（spec + design + task cards），用于后续按 P0–P3 可审计推进，避免实现阶段漂移与返工。

## What Changes

- 新增 `openspec/specs/writenow-frontend-gap-analysis/`：
  - `spec.md`：Requirements + Scenarios（以“入口补齐”为主）
  - `design/*`：信息架构、落点与失败语义
  - `task_cards/*`：按 P0–P3 拆分 15 张任务卡（与 Plan 的 TODO 一一对应）
- 更新 `openspec/project.md`：增加新 spec 索引条目
- 新增本次交付的 RUN_LOG：`openspec/_ops/task_runs/ISSUE-365.md`

## Impact

- Affected specs:
  - `openspec/specs/writenow-frontend-gap-analysis/**`
  - `openspec/project.md`
- Affected code:
  - None（docs-only）
  - `rulebook/tasks/issue-365-frontend-gap-analysis-spec/**`
  - `openspec/_ops/task_runs/ISSUE-365.md`
- Breaking change: NO
- User benefit:
  - 后续执行时有清晰的“入口补齐路线图”（P0–P3）与可验收任务卡，确保核心差异化能力可以被低成本、可追溯地交付到 `writenow-frontend` 主路径。
