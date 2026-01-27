# Proposal: issue-301-p1-003-closeout

## Why
PR #300 已合并，但 OpenSpec task card 仍为 Planned 且未勾选验收项；同时 Rulebook task 需要归档，保证三体系交付闭环可审计。

## What Changes
- 更新 P1-003 task card：补齐 Status/Issue/PR/RUN_LOG，并勾选必读/任务/验收清单为 done。
- 归档 rulebook task：issue-299-p1-003-review-mode → rulebook/tasks/archive/...

## Impact
- Affected specs:
  - openspec/specs/sprint-write-mode-ide/task_cards/p1/P1-003-ai-review-mode.md
- Affected code:
  - rulebook/tasks/{issue-299-p1-003-review-mode,archive/...}
- Breaking change: NO
- User benefit: 交付流程可追溯，减少 spec/task 漂移。
