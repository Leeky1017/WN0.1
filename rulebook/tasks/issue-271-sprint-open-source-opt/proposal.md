# Proposal: issue-271-sprint-open-source-opt

## Why

- `.cursor/plans/wn_open_source_optimization_c81686d6.plan.md` 属于“计划体”，缺少 OpenSpec Sprint 交付所需的：
  - 可验证的 MUST/SHOULD Requirements + Scenario
  - 可追溯的 design 分解（架构图/选型/代码示例）
  - 可执行的 task cards（元信息/前置/清单/验收/产出）
- 将其转化为标准 OpenSpec 规范后，可作为后续实现的 **唯一事实来源（SSOT）**，并与 `AGENTS.md` 的交付流程（Issue → Branch → PR → RUN_LOG）对齐。

## What Changes

- 新增 Sprint 规范：`openspec/specs/sprint-open-source-opt/`
  - `spec.md`：固化需求（Prompt Caching / TipTap AI Diff / Local LLM Tab / E2E / Graphiti / LiteLLM）。
  - `design/*.md`：提供架构图、技术选型与代码示例。
  - `task_cards/**`：按 Phase 输出任务卡索引与 6 张任务卡。
- 记忆层章节仅引用 `sprint-ai-memory` 规范（不在本 Sprint 重复定义）。
- 新增 RUN_LOG：`openspec/_ops/task_runs/ISSUE-271.md` 记录执行证据。

## Impact

- Affected specs:
  - `openspec/specs/sprint-open-source-opt/**`
- Affected code:
  - None（本 PR 只新增规范文档与任务卡）
- Breaking change: NO
- User benefit:
  - 为“开源方案优化”提供可执行的规范入口与任务拆解，降低后续实现风险并提升协作效率。
