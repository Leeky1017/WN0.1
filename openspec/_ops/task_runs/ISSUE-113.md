# ISSUE-113
- Issue: #113
- Branch: task/113-theia-docs-sync
- PR: https://github.com/Leeky1017/WN0.1/pull/116

## Plan
- Phase 1–2: Add AGENTS.md navigation index; then trim to constitutional constraints (≤150 lines) + add "4) 状态同步（强制）" rule.
- Phase 3: Update writenow-spec + sprint-theia-migration spec to reflect Theia migration and status triggers; move relocated content in.
- Phase 4: Deduplicate OpenSpec docs (openspec/AGENTS.md, openspec/project.md) and (if possible) extend openspec-log-guard rule; validate with `npx openspec validate --specs --strict --no-interactive`.

## Runs
### 2026-01-23 10:57 bootstrap (issue + worktree)
- Command: https://github.com/Leeky1017/WN0.1/issues/115
- Key output: 
- Evidence: Issue #113

### 2026-01-23 10:57 bootstrap (worktree)
- Command: 
- Key output: 
- Evidence: 
### 2026-01-23 02:58 correction (close accidental duplicate issue)
- Command: `gh issue close 115 -c "Accidental duplicate issue created by automation mistake. Canonical tracking issue is #113."`
- Key output: `Closed issue #115 (duplicate)`
- Evidence: Issue #115 is closed; canonical Issue is #113

### 2026-01-23 02:58 bootstrap (record canonical issue + worktree)
- Command: `gh issue create -t "[Docs] 宪法级文档重构 + Theia 迁移状态同步" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/113`
- Evidence: Issue #113

- Command: `git worktree add -b task/113-theia-docs-sync .worktrees/issue-113-theia-docs-sync origin/main`
- Key output: `Preparing worktree (new branch 'task/113-theia-docs-sync')`
- Evidence: `.worktrees/issue-113-theia-docs-sync/`

### 2026-01-23 11:10 validate (openspec)
- Command: `npx openspec validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
- Evidence: CI-equivalent OpenSpec strict validation passed in worktree
### 2026-01-23 11:14 pr
- Command: `gh pr create --title "docs: constitutional doc refactor + Theia migration sync (#113)" --body "Closes #113 ..."`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/116`
- Evidence: PR #116
