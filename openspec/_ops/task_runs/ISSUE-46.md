# ISSUE-46
- Issue: #46
- Branch: task/46-worktree-cleanup
- PR: https://github.com/Leeky1017/WN0.1/pull/47

## Goal
- Add a local-only cleanup helper for merged task worktrees.

## Status
- CURRENT: PR open; waiting for required checks to pass then enable auto-merge.

## Next Actions
- [x] Commit changes with `(#46)`
- [x] Push branch `task/46-worktree-cleanup`
- [ ] Enable auto-merge for PR `#47`
- [ ] Watch required checks (`ci`/`openspec-log-guard`/`merge-serial`) to green
- [x] Backfill `PR:` link in this RUN_LOG

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

### 2026-01-20 openspec validate
- Command:
  - `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output:
  - `Totals: 11 passed, 0 failed`
- Evidence:
  - `openspec/specs/`

### 2026-01-20 dry-run cleanup
- Command:
  - `./scripts/agent_worktree_cleanup.sh 29 sprint-3-rag-impl --dry-run`
- Key output:
  - `Removing worktree: .worktrees/issue-29-sprint-3-rag-impl`
- Evidence:
  - `scripts/agent_worktree_cleanup.sh`

### 2026-01-20 pr
- Command:
  - `gh pr create --base main --head task/46-worktree-cleanup --title "..." --body "..."`
- Key output:
  - `https://github.com/Leeky1017/WN0.1/pull/47`
- Evidence:
  - PR #47
