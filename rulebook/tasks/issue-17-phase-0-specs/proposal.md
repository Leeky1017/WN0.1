# Proposal: Phase 0 基础设施与规范建立

## Goal
为 WriteNow 建立“宪法级约束”、IPC 契约与项目级规范文档，并提供与契约一致的核心 TypeScript 类型定义，作为后续实现与测试的统一基线。

## Scope
- Update `AGENTS.md` to embed constitutional constraints (highest priority).
- Add IPC contract spec under `openspec/specs/api-contract/spec.md`.
- Add project-wide coding/testing standards docs.
- Add core type definitions under `src/types/` aligned with the contract/spec.

## Non-Goals
- Implement IPC handlers or UI features.
- Introduce new runtime dependencies unrelated to type safety and docs.

## Risks & Mitigations
- Spec/type drift: keep `openspec/specs/api-contract/spec.md` as the single source of truth and mirror types in `src/types/ipc.ts`.
- Overly strict constraints blocking iteration: document exceptions policy and error taxonomy clearly.

