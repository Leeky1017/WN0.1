# Proposal: issue-39-sprint-2-5-context-engineering

## Why
WriteNow 的 AI 能力需要“可控且可解释”的上下文注入，否则效果与成本都会不稳定。Sprint 2.5 用 spec-first 的方式把上下文工程（分层组装、KV-Cache 友好 Prompt、Token 预算、对话历史与可视化调试）沉淀为可执行规范，为后续 Sprint（RAG/项目管理/体验增强）提供稳定扩展点。

## What Changes
- 新增 Sprint 2.5 OpenSpec：`openspec/specs/sprint-2.5-context-engineering/`
  - `spec.md`：完整规格说明（分层上下文、Prompt 结构、预算、.writenow、对话历史、可视化）
  - `design/`：架构与关键策略设计（ContextAssembler、TokenBudget、KV-Cache、Conversation、ContextViewer）
  - `task_cards/`：按优先级分组的可执行任务卡片（Acceptance/Files/Deps/Effort/Test）

## Impact
- Affected specs: `openspec/specs/sprint-2.5-context-engineering/spec.md`
- Affected code: none (spec-only)
- Breaking change: NO
- User benefit: 上下文注入可观测、可预算、可复用，为 AI 质量/成本/调试提供硬基础设施
