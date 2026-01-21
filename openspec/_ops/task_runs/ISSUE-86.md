# ISSUE-86
- Issue: #86
- Branch: task/86-frontend-deep-remediation
- PR: https://github.com/Leeky1017/WN0.1/pull/87

## Plan
- Align specs + task cards status
- Implement P0/P1 remediation work
- Add E2E + run CI gates

## Runs
### 2026-01-21 00: Setup issue + worktree
- Command: `gh issue create -t "[WN-FRONTEND] Deep remediation P0+P1 (tokens/layout/markdown/statusbar)" -b "<body>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/86`
- Evidence: `openspec/_ops/task_runs/ISSUE-86.md`

### 2026-01-21 01: Create isolated worktree
- Command: `git fetch origin && git worktree add -b "task/86-frontend-deep-remediation" ".worktrees/issue-86-frontend-deep-remediation" origin/main`
- Key output: `Preparing worktree (new branch 'task/86-frontend-deep-remediation')`
- Evidence: `.worktrees/issue-86-frontend-deep-remediation/`

### 2026-01-21 02: Rulebook task scaffolding
- Command: `rulebook task create issue-86-frontend-deep-remediation`
- Key output: `Task issue-86-frontend-deep-remediation created successfully`
- Evidence: `rulebook/tasks/issue-86-frontend-deep-remediation/`

### 2026-01-21 18:47 update visual baselines
- Command: `npx playwright test tests/e2e/frontend-theme-visual.spec.ts --update-snapshots`
- Key output: `1 passed` (dark/light baseline regenerated)
- Evidence: `tests/e2e/frontend-theme-visual.spec.ts-snapshots/frontend-theme-dark-linux.png`

### 2026-01-21 18:48 ipc-contract
- Command: `npm run contract:check`
- Key output: `ipc-contract-sync.js check (no drift)`
- Evidence: `src/types/ipc-generated.ts`

### 2026-01-21 18:49 lint + style-guard
- Command: `npm run lint`
- Key output: `0 errors` (5 existing shadcn/ui warnings)
- Evidence: `scripts/style-guard.js`, `docs/style-guard.md`

### 2026-01-21 18:50 build + e2e
- Command: `npm run test:e2e`
- Key output: `30 passed, 3 skipped`
- Evidence: `dist/`, `tests/e2e/`

### 2026-01-21 18:56 push
- Command: `git push -u origin task/86-frontend-deep-remediation`
- Key output: `task/86-frontend-deep-remediation -> task/86-frontend-deep-remediation`
- Evidence: `git log --oneline -2`

### 2026-01-21 18:56 PR
- Command: `gh pr create --base main --head task/86-frontend-deep-remediation ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/87`
- Evidence: `openspec/_ops/task_runs/ISSUE-86.md`

### 2026-01-21 18:56 auto-merge
- Command: `gh pr merge 87 --auto --rebase`
- Key output: `autoMergeRequest.mergeMethod=REBASE`
- Evidence: `gh pr view 87 --json autoMergeRequest,mergeStateStatus,url`

### 2026-01-21 18:58 openspec
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 11 passed, 0 failed`
- Evidence: `openspec/specs/`

### 2026-01-21 18:58 rulebook
- Command: `rulebook task validate issue-86-frontend-deep-remediation`
- Key output: `✅ Task issue-86-frontend-deep-remediation is valid`
- Evidence: `rulebook/tasks/issue-86-frontend-deep-remediation/`
