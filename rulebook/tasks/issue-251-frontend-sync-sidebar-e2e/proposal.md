# Proposal: issue-251-frontend-sync-sidebar-e2e

## Why
- 当前工作区存在大量未提交的前端 demo/UI 变更（包含新增目录与样式体系调整）。若继续进行 git 操作或 worktree 切换，存在丢失风险，需要先完成“可追溯的同步”。
- `.cursor/plans/frontend-completion-sprint_28130b62.plan.md` 作为 Sprint 执行清单仍有未闭环项（尤其：API 侧边栏视图的真实 E2E 覆盖），需要补齐以满足 AGENTS.md 的测试硬门禁。

## What Changes
- 将当前本地 demo/UI 变更迁移到隔离 worktree 分支并提交/推送，确保不会因后续操作丢失。
- 按 plan 逐项复核并补齐缺口：重点完成 StatsView/HistoryView 等 API 视图的真实 Playwright E2E。
- 若发现与 `openspec/specs/writenow-spec/spec.md` 的规范漂移（例如 design tokens 入口文件约束），同步修正代码与/或规范。

## Impact
- Affected specs: [list]
- Affected code:
  - `writenow-frontend/`（UI 组件、主题/样式、Sidebar 视图、AI 面板）
  - `tests/` / `writenow-frontend/tests/`（新增/增强 Playwright E2E）
  - `writenow-artistic-demo/`、`figma参考/`（demo/reference 资产同步）
- Breaking change: NO（预期为 UI/测试增强与资产同步；若发现破坏性变更将显式标注并修复）
- User benefit: 本地 demo/UI 工作被完整保全且可追溯；侧边栏关键路径具备真实 E2E 门禁，降低回归风险。
