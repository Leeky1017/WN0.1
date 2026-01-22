# Proposal: issue-93-issue-91-closeout

## Why
ISSUE-91 的交付（SKILL System V2 spec/design/task cards）已在 PR #92 合并，但对应的 Rulebook 执行清单仍停留在 `rulebook/tasks/` 活跃目录中。为保持治理一致性与可追溯性，需要将 ISSUE-91 的 Rulebook task 归档到 `rulebook/tasks/archive/`，并保留元数据与任务完成证据，避免活跃任务列表长期累积“已完成但未归档”的噪音。

## What Changes
- 归档 `rulebook/tasks/issue-91-skill-system-v2/` → `rulebook/tasks/archive/<date>-issue-91-skill-system-v2/`
- `rulebook` 元数据标记为 completed（归档后可追溯）
- 新增 RUN_LOG：`openspec/_ops/task_runs/ISSUE-93.md`

## Impact
- Affected specs: None
- Affected code: None
- Breaking change: NO
- User benefit: 保持 Rulebook 任务目录干净可读，确保已交付事项可审计、可定位
