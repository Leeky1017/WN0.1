# ISSUE-289
- Issue: #289
- Branch: task/289-rulebook-archive
- PR: https://github.com/Leeky1017/WN0.1/pull/290

## Plan
- 将已完成任务的 Rulebook task 目录移动到 `rulebook/tasks/archive/` 并提交到 Git（避免主任务目录膨胀）
- 保持 active tasks 目录仅包含进行中任务，便于检索与审计

## Runs
### 2026-01-27 00:00 Issue + worktree
- Command: `gh issue create -t "[RULEBOOK] Archive completed tasks (281/287)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/289`

### 2026-01-27 13:00 Rulebook task archive
- Command: `rulebook task archive issue-281-write-mode-ssot`
- Key output: `Task issue-281-write-mode-ssot archived successfully`
- Command: `rulebook task archive issue-287-write-mode-closeout`
- Key output: `Task issue-287-write-mode-closeout archived successfully`
- Evidence:
  - `rulebook/tasks/archive/2026-01-27-issue-281-write-mode-ssot/`
  - `rulebook/tasks/archive/2026-01-27-issue-287-write-mode-closeout/`

