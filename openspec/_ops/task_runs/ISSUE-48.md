# ISSUE-48
- Issue: #48
- Branch: task/48-sprint-2-ai-a
- PR: https://github.com/Leeky1017/WN0.1/pull/49

## Plan
- Implement main-process Claude streaming IPC (run/cancel + baseUrl)
- Add SKILL/Diff/Version history loop with E2E coverage

## Runs
### 2026-01-20 setup
- Command: `gh issue create -t "[SPRINT-02-AI-A] Sprint 2 Stage A: 基础 AI 能力" -b "<body>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/48`
- Evidence: `openspec/_ops/task_runs/ISSUE-48.md`

### 2026-01-20 worktree
- Command: `git worktree add -b task/48-sprint-2-ai-a .worktrees/issue-48-sprint-2-ai-a origin/main`
- Key output: `Preparing worktree (new branch 'task/48-sprint-2-ai-a')`
- Evidence: `.worktrees/issue-48-sprint-2-ai-a/`

### 2026-01-20 deps
- Command: `npm install`
- Key output: `added 996 packages`
- Evidence: `package-lock.json`

### 2026-01-20 unit
- Command: `npm test`
- Key output: `9 passed`
- Evidence: `src/lib/*.test.ts`

### 2026-01-20 e2e
- Command: `npm run test:e2e`
- Key output: `8 passed, 2 skipped (Sprint 2 AI requires WN_E2E_AI_API_KEY)`
- Evidence: `tests/e2e/sprint-2-ai.spec.ts`
