# ISSUE-129
- Issue: #129
- Branch: task/129-theia-windows-smoke-electron-quoting
- PR: <fill-after-created>

## Plan
- Fix PowerShell quoting in the electron smoke step so stdout/stderr can be concatenated and searched reliably.
- Rerun `theia-windows-smoke` on `main` and record evidence in RUN_LOG.

## Runs
### 2026-01-23 16:58 setup (issue + worktree)
- Command: `gh issue create ... && git worktree add -b task/129-theia-windows-smoke-electron-quoting .worktrees/issue-129-theia-windows-smoke-electron-quoting origin/main`
- Key output: `.../issues/129` + `Preparing worktree (new branch 'task/129-theia-windows-smoke-electron-quoting')`
- Evidence: `.worktrees/issue-129-theia-windows-smoke-electron-quoting/`

