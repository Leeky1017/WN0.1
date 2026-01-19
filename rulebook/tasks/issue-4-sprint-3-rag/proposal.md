# Proposal: issue-4-sprint-3-rag

## Why
Sprint 3 聚焦「智能上下文」，需要一套可执行、可验收的增量规范与任务卡，明确 Embedding/FTS5/sqlite-vec/RAG 的范围与依赖，避免实现过程中与核心规范产生漂移。

## What Changes
- 新增 `openspec/specs/sprint-3-rag/spec.md`：Sprint 3（智能上下文 / RAG）增量规范（Purpose/Requirements/Scenario）。
- 新增 `openspec/specs/sprint-3-rag/tasks/*.md`：5 张 Sprint 3 任务卡（001-005）。
- 新增 `openspec/_ops/task_runs/ISSUE-4.md`：本次交付的运行日志（PR 硬门禁文件）。

## Impact
- Affected specs: `openspec/specs/sprint-3-rag/spec.md`
- Affected code: none (spec-only)
- Breaking change: NO
- User benefit: Sprint 3 范围、依赖与验收口径清晰，便于并行实现与 PR 拆分
