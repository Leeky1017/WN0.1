# ISSUE-125
- Issue: #125
- Branch: task/125-theia-windows-smoke-yarn-cmd
- PR: <fill-after-created>

## Plan
- Fix `theia-windows-smoke` start steps to launch Yarn via `cmd.exe /c` (avoid shim `%1 is not a valid Win32 application`).
- Rerun `theia-windows-smoke` on `main` and record the run link + key output as Windows evidence.

## Runs
### 2026-01-23 16:30 setup (issue + worktree)
- Command: `gh issue create ... && git worktree add -b task/125-theia-windows-smoke-yarn-cmd .worktrees/issue-125-theia-windows-smoke-yarn-cmd origin/main`
- Key output: `.../issues/125` + `Preparing worktree (new branch 'task/125-theia-windows-smoke-yarn-cmd')`
- Evidence: `.worktrees/issue-125-theia-windows-smoke-yarn-cmd/`

