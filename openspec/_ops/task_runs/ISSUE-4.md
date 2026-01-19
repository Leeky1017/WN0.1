# ISSUE-4
- Issue: #4
- Branch: task/4-sprint-3-rag
- PR: https://github.com/Leeky1017/WN0.1/pull/8

## Plan
- Add Sprint 3 RAG spec + task cards
- Validate OpenSpec (strict)
- Open PR with auto-merge

## Runs
### 2026-01-19 Create GitHub Issue
- Command: `gh issue create --repo Leeky1017/WN0.1 -t "[SPRINT-03] 智能上下文（RAG）: Spec + Task Cards" -b "<body>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/4`
- Evidence: Issue #4

### 2026-01-19 Create worktree + branch
- Command: `git worktree add -b task/4-sprint-3-rag .worktrees/issue-4-sprint-3-rag`
- Key output: `Preparing worktree (new branch 'task/4-sprint-3-rag')`
- Evidence: `.worktrees/issue-4-sprint-3-rag/`

### 2026-01-19 Rulebook task created
- Command: `rulebook task create issue-4-sprint-3-rag`
- Key output: `✅ Task issue-4-sprint-3-rag created successfully`
- Evidence: `rulebook/tasks/issue-4-sprint-3-rag/`

### 2026-01-19 OpenSpec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 4 passed, 0 failed (4 items)`
- Evidence: `openspec/specs/sprint-3-rag/spec.md`

### 2026-01-19 Push branch
- Command: `git push -u origin HEAD`
- Key output: `* [new branch]      HEAD -> task/4-sprint-3-rag`
- Evidence: `origin/task/4-sprint-3-rag`

### 2026-01-19 PR created
- Command: `gh pr create --repo Leeky1017/WN0.1 --base main --head task/4-sprint-3-rag ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/8`
- Evidence: PR #8

### 2026-01-19 Rulebook task archived
- Command: `rulebook task archive issue-4-sprint-3-rag`
- Key output: `✅ Task issue-4-sprint-3-rag archived successfully`
- Evidence: `rulebook/tasks/archive/2026-01-19-issue-4-sprint-3-rag/`

### 2026-01-19 OpenSpec validate (strict, archive PR)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 4 passed, 0 failed (4 items)`
- Evidence: `rulebook/tasks/archive/2026-01-19-issue-4-sprint-3-rag/`
