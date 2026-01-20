# Proposal: issue-29-sprint-3-rag-impl

## Why
Sprint 3 需要把“智能上下文”从规格落到可复用的本地基础设施：FTS5 全文索引、本地 Embedding（离线）、sqlite-vec 向量召回与最小 RAG 管线（人物/设定优先）。这些能力是后续 AI SKILL、全文/语义搜索与一致性检查的硬依赖，必须先打通数据层与证据链（E2E）。

## What Changes
- Add SQLite schema + migrations for Sprint 3: richer FTS5 index, sqlite-vec vector tables, and metadata needed for retrieval evidence.
- Implement main-process services + IPC endpoints per API contract:
  - `search:fulltext` (FTS5)
  - `embedding:encode` / `embedding:index`
  - `search:semantic` (embedding + sqlite-vec)
- Implement a minimal, reusable RAG retrieval pipeline (keyword + vector recall, merge/dedupe, budget control) and character/setting recall (exact first, semantic fallback).
- Add true Playwright E2E coverage (real app, real DB, real indexing/search) for the user-facing path: write → index → search/retrieve.

## Impact
- Affected specs: `openspec/specs/sprint-3-rag/spec.md`
- Affected code: `electron/`, `tests/e2e/`, `src/types/`
- Breaking change: NO (new IPC endpoints only; existing file flows remain compatible)
- User benefit: Local-first search + RAG context become available and observable, enabling higher-quality AI assistance without leaking data to the cloud.
