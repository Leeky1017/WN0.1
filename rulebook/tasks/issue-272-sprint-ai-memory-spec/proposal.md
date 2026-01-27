# Proposal: issue-272-sprint-ai-memory-spec

## Why
`.cursor/plans/ai_memory_research_report_c05e39ce.plan.md` 已沉淀了 WriteNow「上下文管理 + 记忆系统 + SKILL 工程」的行业调研与路线图，但仍处于 Cursor Plan 的非规范形态，无法作为 Sprint 交付与验收的单一事实来源（SSOT）。

需要将该研究报告转化为标准 OpenSpec（Purpose/Requirements/Scenarios + design + task cards），以便后续实现阶段按 Phase 推进，避免范围漂移与“口头约定”式的上下文工程策略失真。

## What Changes
- 新增 `openspec/specs/sprint-ai-memory/spec.md`：AI Memory Sprint 的 Purpose/Requirements/Scenarios（MUST/SHOULD + Scenario）
- 新增 `openspec/specs/sprint-ai-memory/design/*.md`：6 层记忆架构、KV-cache 稳定前缀优化、偏好学习、SKILL 动态上下文注入、知识图谱设计
- 新增 `openspec/specs/sprint-ai-memory/task_cards/**`：P0/P1/P2 任务卡与索引
- 新增 `openspec/_ops/task_runs/ISSUE-272.md`：本次交付 Run Log（命令 + 输出 + 证据）

## Impact
- Affected specs: `openspec/specs/sprint-ai-memory/**`
- Affected code: None（docs-only）
- Breaking change: NO
- User benefit: 将“AI 记忆 + 上下文工程”的关键约束变成可执行、可验收的 Sprint 规范与任务卡；为后续实现提供稳定的验收口径与设计参考
