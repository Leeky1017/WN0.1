# Proposal: issue-149-theia-rag-migration

## Why
RAG（全文检索 + 语义检索）是 WriteNow 的“项目级上下文工程”核心基础设施。Task 009 已将 SQLite 数据层迁移到 Theia backend；本任务需要把 chunking/indexer/retrieval 与 sqlite-vec 向量存储迁移到 Theia backend，并通过 RPC 提供可复现、可观测的索引与检索能力，为后续 Embedding（Task 011）与 UI 接线打下基线。

## What Changes
- 迁移 `electron/lib/rag/*` 与 `electron/lib/vector-store.cjs` 到 `writenow-theia/writenow-core/src/node/rag/*`。
- 在 Theia backend 增加 index/retrieval 服务（RPC）：显式索引入口 + 检索入口（错误码稳定、失败可观测）。
- 通过 sqlite-vec 管理 vec0 虚拟表，并验证向量写入与向量查询。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/task_cards/p2/010-rag-migration.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code:
  - `writenow-theia/writenow-core/src/node/rag/**`
  - `writenow-theia/writenow-core/src/node/services/**`
- Breaking change: NO (new capabilities in Theia migration line; Electron app remains unchanged)
- User benefit:
  - Theia 形态可对项目/文章执行索引与检索，返回可解释上下文结果，为 AI 体验提供“可追溯的上下文工程”基座。
