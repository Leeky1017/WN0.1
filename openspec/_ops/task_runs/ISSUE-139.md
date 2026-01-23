# ISSUE-139
- Issue: #139
- Branch: task/139-issue-137-closeout
- PR: https://github.com/Leeky1017/WN0.1/pull/140

## Plan
- Archive the Rulebook task for Issue #137 into `rulebook/tasks/archive/` and keep `rulebook/tasks/` tidy.
- Create PR + ensure required checks pass.

## Runs
### 2026-01-24 01:50 Issue + worktree
- Command: `gh issue create -t "[GOV] Closeout: archive Rulebook task for #137" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/139`
- Command: `git worktree add -b "task/139-issue-137-closeout" ".worktrees/issue-139-issue-137-closeout" origin/main`
- Key output: `Preparing worktree (new branch 'task/139-issue-137-closeout')`

### 2026-01-24 01:52 Rulebook task
- Command: `rulebook task create issue-139-issue-137-closeout`
- Key output: `Location: rulebook/tasks/issue-139-issue-137-closeout/`
- Command: `rulebook task validate issue-139-issue-137-closeout`
- Key output: `✅ Task issue-139-issue-137-closeout is valid`
- Evidence: `rulebook/tasks/issue-139-issue-137-closeout/{proposal.md,tasks.md,specs/**/spec.md}`

### 2026-01-24 01:53 Archive Issue #137 task folder
- Command: `git stash pop stash@{0}`
- Key output: `Deleted rulebook/tasks/issue-137-p1-basic-layout/* and added rulebook/tasks/archive/2026-01-23-issue-137-p1-basic-layout/`
- Evidence:
  - Deleted: `rulebook/tasks/issue-137-p1-basic-layout/`
  - Added: `rulebook/tasks/archive/2026-01-23-issue-137-p1-basic-layout/`

### 2026-01-24 01:58 PR
- Command: `gh pr create --title "[GOV] Closeout: archive Rulebook task for #137 (#139)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/140`
- Evidence: `openspec/_ops/task_runs/ISSUE-139.md (PR link filled)`
