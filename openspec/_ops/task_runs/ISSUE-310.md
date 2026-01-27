# ISSUE-310
- Issue: #310
- Branch: task/310-ci-fix-electron-sandbox
- PR: <fill-after-created>

## Plan
- Fix Linux CI Electron launch for Playwright E2E by disabling Chromium SUID sandbox in test-only launcher.

## Runs
### 2026-01-28 03:30 create-issue
- Command: `gh issue create -t "[CI] Fix Electron sandbox launch for Playwright E2E on Linux" -b "<context + acceptance>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/310`
- Evidence: `Issue #310`

### 2026-01-28 03:31 rulebook-task
- Command: `rulebook_task_create(issue-310-ci-fix-electron-sandbox)` + `rulebook_task_validate(issue-310-ci-fix-electron-sandbox)`
- Key output: `valid=true (warnings: no spec files)`
- Evidence: `rulebook/tasks/issue-310-ci-fix-electron-sandbox/`

### 2026-01-28 03:32 worktree
- Command: `git fetch origin && git worktree add -b "task/310-ci-fix-electron-sandbox" ".worktrees/issue-310-ci-fix-electron-sandbox" origin/main`
- Key output: `Preparing worktree (new branch 'task/310-ci-fix-electron-sandbox')`
- Evidence: `.worktrees/issue-310-ci-fix-electron-sandbox/`
