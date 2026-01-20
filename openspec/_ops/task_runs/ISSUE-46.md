# ISSUE-46
- Issue: #46
- Branch: task/46-worktree-cleanup
- PR: <fill>

## Goal
- Add a local-only cleanup helper for merged task worktrees.

## Status
- CURRENT: Implemented cleanup script + docs; ready to commit + open PR + enable auto-merge.

## Next Actions
- [ ] Commit changes with `(#46)`
- [ ] Push branch `task/46-worktree-cleanup`
- [ ] Create PR (body includes `Closes #46`) and enable auto-merge
- [ ] Watch required checks (`ci`/`openspec-log-guard`/`merge-serial`) to green
- [ ] Backfill `PR:` link in this RUN_LOG

## Runs
### 2026-01-20 issue
- Command:
  - `gh issue create -t "chore: add local worktree cleanup script" -b "..."`
- Key output:
  - `https://github.com/Leeky1017/WN0.1/issues/46`
- Evidence:
  - `openspec/_ops/task_runs/ISSUE-46.md`

### 2026-01-20 worktree
- Command:
  - `git fetch origin && git worktree add -b task/46-worktree-cleanup .worktrees/issue-46-worktree-cleanup origin/main`
- Key output:
  - `Preparing worktree (new branch 'task/46-worktree-cleanup')`
- Evidence:
  - `.worktrees/issue-46-worktree-cleanup/`

### 2026-01-20 script syntax check
- Command:
  - `bash -n scripts/agent_worktree_cleanup.sh`
- Key output:
  - `exit 0`
- Evidence:
  - `scripts/agent_worktree_cleanup.sh`
