# ISSUE-123
- Issue: #123
- Branch: task/123-theia-windows-smoke-logs
- PR: https://github.com/Leeky1017/WN0.1/pull/124

## Plan
- Fix the Windows smoke workflow to capture stdout/stderr without PowerShell `Start-Process` redirection conflicts.
- Rerun `theia-windows-smoke` on `main` and record the run link + key output as Windows evidence.

## Runs
### 2026-01-23 16:15 setup (issue + worktree)
- Command: `gh issue create ... && git worktree add -b task/123-theia-windows-smoke-logs .worktrees/issue-123-theia-windows-smoke-logs origin/main`
- Key output: `.../issues/123` + `Preparing worktree (new branch 'task/123-theia-windows-smoke-logs')`
- Evidence: `.worktrees/issue-123-theia-windows-smoke-logs/`

### 2026-01-23 16:20 PR
- Command: `gh pr create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/124`
- Evidence: `PR #124 (Closes #123)`
