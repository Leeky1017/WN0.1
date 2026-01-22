# ISSUE-106
- Issue: #106
- Branch: task/106-theia-migration-spec
- PR: <fill-after-created>

## Plan
- Clean up control-plane changes and publish Theia migration reusability viewpoint.
- Add OpenSpec sprint: `sprint-theia-migration` (spec + design docs + task cards).
- Annotate paused specs/tasks impacted by the Theia migration decision; run OpenSpec validation; ship PR.

## Runs
### 2026-01-22 16:45 issue + worktree
- Command: `gh issue create ... && git stash -u && git fetch origin && git worktree add -b task/106-theia-migration-spec .worktrees/issue-106-theia-migration-spec origin/main`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/106` + `Preparing worktree (new branch 'task/106-theia-migration-spec')`
- Evidence: `.worktrees/issue-106-theia-migration-spec/`, `git branch --show-current`

### 2026-01-22 16:46 rulebook
- Command: `rulebook task create issue-106-theia-migration-spec && rulebook task validate issue-106-theia-migration-spec`
- Key output: `✅ Task issue-106-theia-migration-spec is valid` (warning: no spec files yet)
- Evidence: `rulebook/tasks/issue-106-theia-migration-spec/`

