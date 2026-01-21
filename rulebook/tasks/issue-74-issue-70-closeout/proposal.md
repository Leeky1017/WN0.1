# Proposal: issue-74-issue-70-closeout

## Why
PR #73 已合并并交付 Sprint 6 A（创作统计 + 番茄钟）核心能力，但 OpenSpec task cards 与 `writenow-spec` 路线图尚未同步完成状态，Rulebook task 也需要归档以符合治理流程与可追溯要求。

## What Changes
- 更新 Sprint 6 task 文档（001/002）：补齐完成元数据（Status/Issue/PR/RUN_LOG）并勾选验收标准。
- 同步 `openspec/specs/writenow-spec/spec.md` Sprint 6 路线图：标记「创作统计 / 番茄钟」已完成。
- 归档 Rulebook task：将 `rulebook/tasks/issue-70-s6-stats-pomodoro` 移动到 `rulebook/tasks/archive/`。

## Impact
- Affected specs: `openspec/specs/sprint-6-experience/tasks/001-writing-stats.md`, `openspec/specs/sprint-6-experience/tasks/002-pomodoro-timer.md`, `openspec/specs/writenow-spec/spec.md`
- Affected code: `rulebook/tasks/**` (archive only)
- Breaking change: NO
- User benefit: 交付闭环可审计：规范/任务卡/路线图与实际实现保持一致，便于后续 Sprint 推进与回溯。
