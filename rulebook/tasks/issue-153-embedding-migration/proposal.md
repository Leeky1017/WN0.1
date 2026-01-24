# Proposal: issue-153-embedding-migration

## Why
The Theia backend migration (Phase 2) currently leaves semantic retrieval in a degraded state: `search:semantic` returns `MODEL_NOT_READY` because the embedding service is missing. This blocks end-to-end RAG semantic recall validation and prevents Phase 2 core migration from being considered complete.

## What Changes
- Add a Theia-backend Embedding service implemented as a `worker_threads` worker that loads `@xenova/transformers` and performs text embedding.
- Implement offline/online model asset handling (HuggingFace download with local cache, controlled by env).
- Add Theia RPC handlers for `embedding:encode` / `embedding:index`.
- Integrate Embedding into:
  - RAG indexing (write chunk/article/entity vectors to sqlite-vec tables)
  - RAG retrieval (semantic recall enabled)
  - Semantic search (`search:semantic` now returns relevant results)
- Extend `writenow-core/scripts/rpc-smoke.cjs` to verify embedding + semantic search + timeout semantics end-to-end.
- Extend IPC error code set with `ENCODING_FAILED` (non-timeout embedding failures) and update the API contract spec accordingly.

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/task_cards/p2/011-embedding-migration.md`
  - `openspec/specs/api-contract/spec.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code:
  - `writenow-theia/writenow-core/src/node/embedding/*`
  - `writenow-theia/writenow-core/src/node/services/*`
  - `writenow-theia/writenow-core/src/node/rag/*`
  - `writenow-theia/writenow-core/scripts/rpc-smoke.cjs`
  - `electron/ipc/contract/ipc-contract.cjs` + generated `ipc-generated.ts`
- Breaking change: NO (adds a new error code; enables previously-degraded semantic features)
- User benefit: Theia semantic search and RAG semantic passages are available end-to-end with observable failures and retryability.

