# Proposal: issue-348-frontend-plan-delivery

## Why
- 当前仓库中已存在一批基于 `~/.cursor/plans/wn_前端全面优化_c8d2d8f1.plan.md` 的 `writenow-frontend/` 改动，但未按 OpenSpec + Rulebook + GitHub 的治理流程完成“可审计交付”（Issue/Branch/PR/Checks/RUN_LOG）。
- 本任务用于把这批改动补齐治理工序并交付到主干，避免出现“代码已写但无人可追溯/不可复现”的状态漂移。

## What Changes
- 为 `writenow-frontend/` 接入 i18next + react-i18next，新增语言切换与持久化，并将关键入口（ActivityBar/SidebarPanel/Settings）逐步替换为可翻译文案。
- 在 Settings 中新增 Update 管理 UI（`update:*`），可查看状态并触发 check/download/install/skip/clearSkipped。
- 增量补齐 a11y 基线（icon-only 按钮 aria-label、折叠按钮可读标签、状态/错误的 aria-live/role）。
- 新增 E2E 覆盖语言切换与 Update UI 的关键路径。
- 补齐 Rulebook task/spec 与 RUN_LOG，形成可审计交付链路。

## Impact
- Affected specs:
  - `rulebook/tasks/issue-348-frontend-plan-delivery/specs/frontend-plan-delivery/spec.md`
- Affected code:
  - `writenow-frontend/**`
  - `rulebook/tasks/issue-348-frontend-plan-delivery/**`
  - `openspec/_ops/task_runs/ISSUE-348.md`
- Breaking change: NO（增量新增/补齐入口，不改变既有对外契约）
- User benefit:
  - 用户可在 Settings 中切换语言并持久化；更新能力可见且可操作；整体可访问性与可观测性更好。
