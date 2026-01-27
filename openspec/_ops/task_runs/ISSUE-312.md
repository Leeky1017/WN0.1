# ISSUE-312
- Issue: #312
- Branch: task/312-ci-e2e-wait-connected
- PR: <fill-after-created>

## Plan
- Stabilize Playwright Electron E2E helpers by waiting for backend connection before file operations.

## Runs
### 2026-01-28 03:45 create-issue
- Command: `gh issue create -t "[CI] Stabilize Playwright E2E file creation (wait for backend connection)" -b "<context + acceptance>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/312`
- Evidence: `Issue #312`

### 2026-01-28 03:46 rulebook-task
- Command: `rulebook_task_create(issue-312-ci-e2e-wait-connected)` + `rulebook_task_validate(issue-312-ci-e2e-wait-connected)`
- Key output: `valid=true (warnings: no spec files)`
- Evidence: `rulebook/tasks/issue-312-ci-e2e-wait-connected/`

### 2026-01-28 03:47 worktree
- Command: `git fetch origin && git worktree add -b "task/312-ci-e2e-wait-connected" ".worktrees/issue-312-ci-e2e-wait-connected" origin/main`
- Key output: `Preparing worktree (new branch 'task/312-ci-e2e-wait-connected')`
- Evidence: `.worktrees/issue-312-ci-e2e-wait-connected/`
