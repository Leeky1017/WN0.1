# 010: RAG Migration（indexer + retrieval）

## Context

RAG（全文 + 语义）是 WriteNow “项目级上下文工程”与 AI 体验的核心基础设施。代码层面可复用度高，但依赖 sqlite-vec 与存储语义；因此需要在 Theia backend 中迁移并跑通最小闭环。

## Requirements

- 迁移 indexer：拆段、写 `article_chunks`、写 vec、增量更新策略。
- 迁移 retrieval：keyword recall（FTS）+ semantic recall（vec）+ budget 控制。
- 与 Theia workspace/file system 对齐：明确索引根目录、忽略规则与 watcher 触发点。

## Acceptance Criteria

- [ ] 在 Theia 上可对一个 workspace/project 执行索引，并在 DB/vec 中看到可验证的数据写入。
- [ ] 可对同一项目执行一次检索，返回可解释结果（至少包含若干 passages/entity hits）。
- [ ] 索引/检索失败路径可观测：错误码/日志可定位，且具备重试策略。

## Dependencies

- `002`
- `003`
- `009`

## Estimated Effort

- L（3–5 天）

