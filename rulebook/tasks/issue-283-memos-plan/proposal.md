# Proposal: issue-283-memos-plan

## Why
`openspec/specs/sprint-ai-memory/spec.md` 已经是 AI Memory Sprint 的权威规范（SSOT），并提供了 6 层记忆架构、KV-cache 稳定前缀、偏好注入等关键约束。

但在工程落地层面仍缺少一份“可执行的补充计划”：需要把 MemOS/Mem0 的可借鉴点落到 WriteNow 的现有实现与具体落点上（尤其数据模型一步到位、语义召回接入点、stablePrefixHash 口径与交付流程），否则后续实现阶段很容易出现反复改 schema、接口漂移与验收口径不一致。

## What Changes
- 新增 `.cursor/plans/memos_设计借鉴方案_fed49a61.plan.md`：作为 `sprint-ai-memory` 的非规范补充材料（工程落地计划）
- 在 `openspec/specs/sprint-ai-memory/spec.md` 增加对该 plan 的引用说明（明确“补充、不替代 spec”）
- 新增 `openspec/_ops/task_runs/ISSUE-283.md`：记录本次交付命令与证据
- 完成 Rulebook task `issue-283-memos-plan` 的 proposal/tasks，并通过 validate

## Impact
- Affected specs: `openspec/specs/sprint-ai-memory/spec.md`（仅增加非规范引用说明）
- Affected code: None（docs-only）
- Breaking change: NO
- User benefit: 提供一份与现有实现对齐、可直接执行与验收的补充计划，明确“一步到位”的数据模型与语义召回落点，降低后续实现期的返工成本
