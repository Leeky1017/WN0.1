# Proposal: issue-333-open-source-opt-closeout

## Why
P2/P3 的实现 PR 已合并，但仍存在 rulebook task 未归档、task card 元信息未补齐、writenow-spec 状态未同步的问题。
若不做 closeout，会导致交付留痕断裂（任务完成但规范/索引漂移），并削弱后续审计与回溯能力。

## What Changes
- 归档已完成的 rulebook tasks（#327/#330）。
- 更新 P3-001 task card：补齐完成元信息并勾选验收清单。
- 同步 `writenow-spec` 中 Open-Source-Opt Sprint 的阶段/任务完成状态，避免规范漂移。

## Impact
- Affected specs:
  - `openspec/specs/sprint-open-source-opt/task_cards/p3/P3-001-litellm-proxy.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code: None（仅文档与 rulebook 归档）
- Breaking change: NO
- User benefit: 交付链路可追溯、规范与实现对齐、后续维护与审计成本降低
