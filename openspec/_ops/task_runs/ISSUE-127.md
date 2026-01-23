# ISSUE-127
- Issue: #127
- Branch: task/127-theia-windows-smoke-build-browser
- PR: https://github.com/Leeky1017/WN0.1/pull/128

## Plan
- Fix theia-windows-smoke to run the browser build/bundle before starting the browser target.
- Rerun the workflow on `main` and record evidence in RUN_LOG.

## Runs
### 2026-01-23 16:45 setup (issue + worktree)
- Command: `gh issue create ... && git worktree add -b task/127-theia-windows-smoke-build-browser .worktrees/issue-127-theia-windows-smoke-build-browser origin/main`
- Key output: `.../issues/127` + `Preparing worktree (new branch 'task/127-theia-windows-smoke-build-browser')`
- Evidence: `.worktrees/issue-127-theia-windows-smoke-build-browser/`

### 2026-01-23 16:52 PR
- Command: `gh pr create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/128`
- Evidence: `PR #128 (Closes #127)`
