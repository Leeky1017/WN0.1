# Proposal: issue-67-issue-61-closeout

## Why
Issue #61 的实现已在 PR #65 合并，但对应 OpenSpec task cards 与路线图状态尚未同步，导致“规范/证据”与实际实现存在漂移风险，且不利于后续审计与回溯。

## What Changes
- 更新 `CONTEXT-P1-005/006/007` task cards：勾选验收/测试并补齐完成元数据（Status/Issue/PR/RUN_LOG）。
- 同步 `openspec/specs/writenow-spec/spec.md` 路线图中 Sprint 2.5 的完成状态。

## Impact
- Affected specs:
  - `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-005-editor-context-sync.md`
  - `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-006-entity-detection.md`
  - `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-007-prompt-template-system.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code: none
- Breaking change: NO
- User benefit: 规范与实现一致、验收可追溯、后续迭代不漂移
