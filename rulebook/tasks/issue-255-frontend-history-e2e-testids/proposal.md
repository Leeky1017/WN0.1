# Proposal: issue-255-frontend-history-e2e-testids

## Why
Frontend Completion plan 中 HistoryView（侧边栏）缺少真实 Electron E2E 覆盖，且 Agent runner / browser MCP 脚本依赖的 `data-testid` 存在缺失/不一致，导致回归风险与自动化不可用。

## What Changes
- 补齐并对齐关键 `data-testid`（FilesView 创建入口、HistoryView 列表与刷新）。
- 新增 `writenow-frontend/tests/utils/e2e-helpers.ts` 并复用，减少 E2E 重复代码与选择器漂移。
- 新增侧边栏视图 E2E：StatsView（真实数据）与 HistoryView（列表/预览/恢复）。
- 将 `agent-test-runner.spec.ts` 从依赖外部 dev server 调整为 Electron E2E 执行，确保 `npm run test:e2e` 可直接跑通。
- 同步更新 `tests/mcp/browser-tests.md` 的选择器说明（保持与实现一致）。

## Impact
- Affected specs: `.cursor/plans/frontend-completion-sprint_28130b62.plan.md`（仅状态/对齐说明，若本次更新）
- Affected code:
  - `writenow-frontend/src/features/sidebar/FilesView.tsx`
  - `writenow-frontend/src/features/sidebar/HistoryView.tsx`
  - `writenow-frontend/tests/**`
- Breaking change: NO（仅测试选择器与测试文件结构；不影响用户功能）
- User benefit: 版本历史与侧边栏关键路径拥有可复现的 E2E 回归保护；Agent 自动化脚本可稳定驱动 UI。
