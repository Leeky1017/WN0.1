# Proposal: issue-344-ai-memory-semantic-recall

## Why
WriteNow 已完成 AI Memory 基线（stablePrefixHash + 自动偏好注入），但 `user_memory` 仍缺少语义召回能力与可审计数据模型。本变更创建 Sprint 级规范，明确 sqlite-vec `vec0` 的 `user_memory_vec` 索引、`memory:injection:preview` 的 `queryText` 接入、stablePrefixHash 边界、降级策略与软删除/证据字段，为后续实现与 E2E 验收提供 SSOT。

## What Changes
- 新增 Sprint Spec：`openspec/specs/sprint-ai-memory-semantic-recall/`
  - `spec.md`：增量需求（MUST/SHOULD）、技术栈锁定与场景
  - `design/`：`user_memory_vec` 与数据模型增强设计
  - `task_cards/`：拆分 P0/P1 任务卡（含验收标准与必读前置）
- 更新上游：在 `openspec/specs/writenow-spec/spec.md` 路线图新增该 Sprint（Draft），并与新 spec 双向引用
- 完善 Rulebook task：补齐本任务的执行清单与 spec delta（指向 OpenSpec SSOT）

## Impact
- Affected specs:
  - `openspec/specs/writenow-spec/spec.md`
  - `openspec/specs/sprint-ai-memory-semantic-recall/spec.md`
- Affected code: 本 PR 为规范/文档变更（未来实现预计影响：`vector-store.ts`, `memory-service.ts`, `schema.sql`, `ipc-contract.cjs`, `context-assembler.ts`）
- Breaking change: NO
- User benefit: 语义召回与可审计数据模型的落地路径被固定，可在不破坏 stablePrefixHash 的前提下增强记忆相关性，并确保任何召回失败都不阻断 SKILL 运行（可观测、可恢复）。
