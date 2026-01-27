# Proposal: issue-274-sprint-ai-memory-spec-polish

## Why
`openspec/specs/sprint-ai-memory/` 已作为实现阶段的上游规范，但当前仍存在几处容易在实现时产生“解释分歧”的点（例如 `context_rules.surrounding` 的单位、未知字段处理、6 层与既有 4 层上下文工程术语的映射、稳定前缀 hash 的验收口径等）。

本变更通过补齐可执行约束与可观测信号，降低后续实现/评审成本，并提高任务卡的可验收性与可复现性。

## What Changes
- 更新 `openspec/specs/sprint-ai-memory/spec.md`：补齐 `context_rules` 规范与稳定前缀验收口径（stablePrefixHash vs 全量 system hash）
- 更新 `design/*.md`：增加 6 层 ↔ 4 层映射、单位/引用格式约束、masking 的工程语义澄清
- 更新 `task_cards/*.md`：为每张卡补齐“可观测信号/验证方式”与更具体的 E2E 步骤
- 新增 `openspec/_ops/task_runs/ISSUE-274.md`：本次交付 Run Log（命令 + 输出 + 证据）

## Impact
- Affected specs: `openspec/specs/sprint-ai-memory/**`
- Affected code: None（docs-only）
- Breaking change: NO
- User benefit: 规范更不含糊；实现任务更易验收；稳定前缀与按需注入的收益更可量化、更可调试
