# ISSUE-121
- Issue: #121
- Branch: task/121-theia-windows-smoke-fix
- PR: <fill-after-created>

## Plan
- Fix `writenow-theia/scripts/win-msvc-env.ps1` so it accepts arbitrary arguments (incl. flags starting with `-`).
- Rerun `theia-windows-smoke` workflow on `main` and record the run link + key output as Windows evidence.

## Runs
### 2026-01-23 16:30 setup (issue + worktree)
- Command: `gh issue create ... && git worktree add -b task/121-theia-windows-smoke-fix .worktrees/issue-121-theia-windows-smoke-fix origin/main`
- Key output: `.../issues/121` + `Preparing worktree (new branch 'task/121-theia-windows-smoke-fix')`
- Evidence: `.worktrees/issue-121-theia-windows-smoke-fix/`

