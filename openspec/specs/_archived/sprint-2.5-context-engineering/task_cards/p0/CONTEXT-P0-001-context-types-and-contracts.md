# CONTEXT-P0-001: Context 类型定义与契约（SSOT）

## Goal

建立 Sprint 2.5 的上下文工程类型系统与模块契约（避免漂移）：为 ContextAssembler / TokenBudgetManager / ConversationHistoryManager / EditorContextSync 提供统一可复用的 TypeScript 类型与接口定义。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/spec.md`
- `openspec/specs/sprint-2-ai/spec.md`（SKILL/AI 调用基本约束）

## Expected File Changes

- Add: `src/types/context.ts`（ContextLayer/ContextChunk/AssembledContext/EditorContext/ConversationIndex）
- Update/Add: `src/lib/context/`（仅新增最小 re-export 或占位接口文件，避免重复定义）

## Acceptance Criteria

- [ ] 不引入 `any`；类型字段可覆盖 spec 中的分层、预算统计、来源追溯与调试需求
- [ ] 类型结构允许后续 Sprint 扩展（RAG retrieved chunks、NER、KV-Cache metrics）而不破坏既有调用方
- [ ] `tsc --noEmit` 通过（严格模式）

## Tests

- [ ] `npm test` / `vitest` 中新增最小导入覆盖（确保 types 可被模块引用且不触发循环依赖）

## Effort Estimate

- S（0.5–1 天）

