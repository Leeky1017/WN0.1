# Notes: issue-149-theia-rag-migration

## Decisions

### Embedding dependency (Task 011)
- **Policy**: retrieval 的语义路径在 Embedding 不可用时 MUST 返回 `MODEL_NOT_READY`（可判定、可重试），同时 keyword recall（FTS）保持可用。
- **Why**: 允许 Task 010 在 Task 011 未完成时仍可交付 indexer/retrieval 主体结构与可观测失败语义，避免阻塞整体迁移。

## Open questions
- 索引范围：先以 `documents` 目录（Theia data dir 下）作为最小闭环索引根；后续与 workspace-first/hybrid project root 接线时再扩展扫描策略与 ignore 规则。

