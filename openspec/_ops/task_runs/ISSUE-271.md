# ISSUE-271
- Issue: #271
- Branch: task/271-sprint-open-source-opt
- PR: <fill-after-created>

## Plan
- Convert `.cursor/plans/wn_open_source_optimization_c81686d6.plan.md` into OpenSpec sprint spec (`spec.md` + `design/*` + `task_cards/*`).
- Ensure spec/task-card formats match OpenSpec conventions (MUST/SHOULD + Scenarios; task-card metadata + acceptance).
- Run OpenSpec + Rulebook validation, open PR, enable auto-merge.

## Runs
### 2026-01-27 14:10 repo preflight
- Command: `gh auth status && git remote -v && ls -la .cursor/plans && ls -la openspec/specs`
- Key output: `Logged in to github.com` + `origin https://github.com/Leeky1017/WN0.1.git` + `wn_open_source_optimization_c81686d6.plan.md present`
- Evidence: `.cursor/plans/wn_open_source_optimization_c81686d6.plan.md`, `openspec/specs/api-contract/spec.md`

### 2026-01-27 14:11 issue + rulebook task
- Command: `gh issue create ...` + `rulebook_task_create/validate issue-271-sprint-open-source-opt`
- Key output: `Issue: https://github.com/Leeky1017/WN0.1/issues/271` + `Task valid: true`
- Evidence: `rulebook/tasks/issue-271-sprint-open-source-opt/`

### 2026-01-27 14:12 worktree
- Command: `git fetch origin && git worktree add -b task/271-sprint-open-source-opt .worktrees/issue-271-sprint-open-source-opt origin/main`
- Key output: `Preparing worktree (new branch 'task/271-sprint-open-source-opt')`
- Evidence: `.worktrees/issue-271-sprint-open-source-opt/`

### 2026-01-27 14:52 openspec validate
- Command: `openspec validate --specs --strict --no-interactive`
- Key output: `Totals: 3 passed, 0 failed (3 items)`
- Evidence: `openspec/specs/sprint-open-source-opt/`

### 2026-01-27 14:52 rulebook validate
- Command: `rulebook task validate issue-271-sprint-open-source-opt`
- Key output: `✅ Task issue-271-sprint-open-source-opt is valid`
- Evidence: `rulebook/tasks/issue-271-sprint-open-source-opt/`
