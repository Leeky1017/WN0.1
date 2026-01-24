# ISSUE-162
- Issue: #162
- Branch: task/162-issue-159-rulebook-archive
- PR: https://github.com/Leeky1017/WN0.1/pull/163

## Plan
- Commit the Rulebook task archive move for #159 (tasks/ -> tasks/archive/).
- Validate repo gates (openspec).

## Runs
### 2026-01-24 19:51 Issue + worktree
- Command: `gh issue create -t "[GOV] Closeout: archive Rulebook task for #159" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/162`
- Command: `git worktree add -b task/162-issue-159-rulebook-archive .worktrees/issue-162-issue-159-rulebook-archive origin/main`
- Key output: `Preparing worktree (new branch 'task/162-issue-159-rulebook-archive')`

### 2026-01-24 19:51 Apply archive changes
- Command: `git stash apply stash@{0}`
- Key output: moved `rulebook/tasks/issue-159-knowledge-graph-widget/` -> `rulebook/tasks/archive/2026-01-24-issue-159-knowledge-graph-widget/`
- Evidence: `rulebook/tasks/archive/2026-01-24-issue-159-knowledge-graph-widget/`

### 2026-01-24 19:52 OpenSpec validate
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
