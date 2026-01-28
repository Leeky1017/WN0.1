# ISSUE-346
- Issue: #346
- Branch: task/346-ai-memory-semantic-recall
- PR: <fill-after-created>

## Plan
- Read Sprint spec + task cards, then inspect current IPC/DB/memory injection implementation.
- Implement P0: `user_memory_vec` (sqlite-vec vec0) + `memory:injection:preview(queryText?)` while protecting `stablePrefixHash`.
- Implement P1: `user_memory` audit fields + soft delete migration (v10), plus fallback/observability and true E2E coverage.

## Runs
### 2026-01-28 20:14 issue + worktree
- Command: `gh issue create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/346`
- Evidence: GitHub Issue `#346`

### 2026-01-28 20:14 fix issue body
- Command: `gh issue edit 346 --body "$(cat <<'EOF' ... EOF)"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/346`
- Evidence: GitHub Issue `#346`

### 2026-01-28 20:14 create worktree
- Command: `git fetch origin && mkdir -p .worktrees && git worktree add -b "task/346-ai-memory-semantic-recall" ".worktrees/issue-346-ai-memory-semantic-recall" origin/main`
- Key output: `Preparing worktree (new branch 'task/346-ai-memory-semantic-recall')`
- Evidence: `.worktrees/issue-346-ai-memory-semantic-recall/`

### 2026-01-28 20:14 rulebook task
- Command: `rulebook task create issue-346-ai-memory-semantic-recall && rulebook task validate issue-346-ai-memory-semantic-recall`
- Key output: `✅ Task issue-346-ai-memory-semantic-recall is valid`
- Evidence: `rulebook/tasks/issue-346-ai-memory-semantic-recall/`

### 2026-01-28 20:14 ipc-contract
- Command: `npm run contract:generate && npm run contract:check`
- Key output: `contract:check exit 0 (no drift)`
- Evidence: `electron/ipc/contract/ipc-contract.cjs`, `src/types/ipc-generated.ts`, `writenow-theia/writenow-core/src/common/ipc-generated.ts`, `writenow-frontend/src/types/ipc-generated.ts`

### 2026-01-28 20:20 install + build (theia)
- Command: `npm run theia:install`
- Key output: `lerna run prepare` + `writenow-core: tsc` exit 0
- Evidence: `writenow-theia/writenow-core/lib/` (generated), build logs

### 2026-01-28 20:21 build browser backend
- Command: `npm run build`
- Key output: `webpack ... compiled successfully`
- Evidence: `writenow-theia/browser-app/lib/`, `writenow-theia/browser-app/dist/`

### 2026-01-28 20:25 lint (repo)
- Command: `npm run lint`
- Key output: exit 0
- Evidence: CI-local lint output

### 2026-01-28 20:26 install + build (writenow-frontend electron)
- Command: `cd writenow-frontend && npm ci && npm run build:electron`
- Key output: `electron-vite build` exit 0
- Evidence: `writenow-frontend/dist-electron/`, `writenow-frontend/dist/`

### 2026-01-28 20:30 e2e (semantic recall)
- Command: `cd writenow-frontend && WSL_DISTRO_NAME= WSL_INTEROP= npx playwright test tests/e2e/write-mode/ai-memory-semantic-recall.spec.ts`
- Key output: `3 passed, 1 flaky (retry), exit 0`
- Note: Increased per-test timeout in `ai-memory-semantic-recall.spec.ts` to reduce cold-cache flake.
- Evidence: `writenow-frontend/tests/e2e/write-mode/ai-memory-semantic-recall.spec.ts`, `writenow-frontend/test-results/**/trace.zip`
