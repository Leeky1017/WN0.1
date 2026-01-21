# ISSUE-90
- Issue: #90
- Branch: task/90-p3-search-kanban
- PR: https://github.com/Leeky1017/WN0.1/pull/95

## Plan
- Implement sidebar search (FTS + semantic) with highlight + navigation
- Add card/kanban view with drag reorder + status + persistence
- Cover with Playwright E2E and keep checks green

## Runs
### 2026-01-21 11:41 setup
- Command: `gh issue create -t "[P3] 搜索 + 看板：全文/语义搜索与章节卡片视图" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/90`
- Evidence: `.worktrees/issue-90-p3-search-kanban/openspec/_ops/task_runs/ISSUE-90.md`

### 2026-01-21 21:19 contract
- Command: `npm run contract:check`
- Key output: `scripts/ipc-contract-sync.js check (ok)`
- Evidence: `src/types/ipc-generated.ts`

### 2026-01-21 21:23 lint
- Command: `npm run lint`
- Key output: `0 errors (warnings only)`
- Evidence: `eslint.config.js`

### 2026-01-21 21:26 unit tests
- Command: `npm test`
- Key output: `13 passed, 34 tests passed`
- Evidence: `src/lib/ipc.test.ts`

### 2026-01-21 21:37 e2e (Playwright)
- Command: `npm run test:e2e`
- Key output: `32 passed, 3 skipped`
- Evidence: `tests/e2e/frontend-search.spec.ts`

### 2026-01-21 21:40 update visual snapshots
- Command: `npx playwright test tests/e2e/frontend-theme-visual.spec.ts --update-snapshots`
- Key output: `frontend-theme-dark-linux.png / frontend-theme-light-linux.png updated`
- Evidence: `tests/e2e/frontend-theme-visual.spec.ts-snapshots/frontend-theme-dark-linux.png`

### 2026-01-21 22:03 PR
- Command: `gh pr create --base main --head task/90-p3-search-kanban ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/95`
- Evidence: https://github.com/Leeky1017/WN0.1/pull/95

### 2026-01-21 22:08 rulebook archive
- Command: `git mv rulebook/tasks/issue-90-p3-search-kanban rulebook/tasks/archive/2026-01-21-issue-90-p3-search-kanban`
- Key output: `issue-90-p3-search-kanban archived`
- Evidence: `rulebook/tasks/archive/2026-01-21-issue-90-p3-search-kanban/`
