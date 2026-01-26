# ISSUE-255
- Issue: #255
- Branch: task/255-frontend-history-e2e-testids
- PR: https://github.com/Leeky1017/WN0.1/pull/256

## Goal
- 补齐 Frontend Completion plan 中缺失的 HistoryView 侧边栏 E2E 覆盖，并对齐 agent runner / browser MCP 文档所依赖的 data-testid，确保 writenow-frontend 的 E2E 套件无需单独 dev server 即可运行。

## Plan
- [ ] 对齐/补齐 data-testid（FilesView create trigger、HistoryView refresh/list 等），并同步 agent-test-runner + browser-tests.md。
- [ ] 新增 `writenow-frontend/tests/utils/e2e-helpers.ts`，抽取 launchApp 等公共逻辑并复用。
- [ ] 新增 HistoryView（必要时含 StatsView）Electron E2E：创建文件→创建快照→验证列表/预览/恢复。
- [ ] 跑 lint/build/e2e 并记录证据；开 PR + auto-merge；合并后清理 worktree。

## Runs

### 2026-01-27 01:43 Worktree + task scaffold
- Command:
  - `gh issue create ...` (see Issue #255)
  - `git worktree add -b task/255-frontend-history-e2e-testids .worktrees/issue-255-frontend-history-e2e-testids origin/main`
  - `rulebook task create issue-255-frontend-history-e2e-testids` (via MCP)
- Key output:
  - Worktree created at `.worktrees/issue-255-frontend-history-e2e-testids`
- Evidence:
  - `rulebook/tasks/issue-255-frontend-history-e2e-testids/`
  - `openspec/_ops/task_runs/ISSUE-255.md`

### 2026-01-27 01:56 writenow-frontend deps + lint/build/unit
- Command: `cd writenow-frontend && npm ci`
- Command: `cd writenow-frontend && npm run lint`
- Command: `cd writenow-frontend && npm run build`
- Command: `cd writenow-frontend && npm test`
- Key output:
  - `15 passed (15)` (vitest)
- Evidence:
  - `writenow-frontend/src/lib/{diff,diffUtils}.test.ts`
  - `writenow-frontend/src/lib/rpc/api.test.ts`

### 2026-01-27 02:05 theia backend bundle (E2E prerequisite)
- Command: `cd writenow-theia && yarn install --frozen-lockfile`
- Command: `cd writenow-theia && yarn build:browser`
- Key output:
  - Backend entry generated under `writenow-theia/browser-app/src-gen/backend/main.js`
- Evidence:
  - `writenow-theia/browser-app/src-gen/backend/main.js`
  - `writenow-theia/browser-app/src-gen/backend/schema.sql`

### 2026-01-27 02:14 writenow-frontend E2E
- Command: `cd writenow-frontend && npm run test:e2e`
- Key output:
  - `10 passed (21.0s)`
- Evidence:
  - `writenow-frontend/tests/e2e/frontend-v2-core.spec.ts`
  - `writenow-frontend/tests/e2e/sidebar-views.spec.ts`
  - `writenow-frontend/tests/e2e/agent-test-runner.spec.ts`
