## 1. Implementation
- [x] Add Embedding service implementation (worker isolation + timeouts) under `writenow-theia/writenow-core/src/node/embedding/`.
- [x] Add `EmbeddingService` contract to `writenow-theia/writenow-core/src/common/writenow-protocol.ts` and bind it in `writenow-core-backend-module.ts`.
- [x] Add Theia RPC handlers for `embedding:encode` / `embedding:index` and register them in `WritenowBackendService`.
- [x] Integrate embedding into RAG indexer + retrieval + `search:semantic` (enable semantic recall).
- [x] Implement ONNX asset fallback for non-AVX512 environments (default to `onnx/model.onnx`).
- [x] Extend IPC error codes with `ENCODING_FAILED` and regenerate IPC contract outputs.

## 2. Testing
- [x] `yarn --cwd writenow-theia/writenow-core rpc:smoke` (embedding + semantic search + timeout)
- [ ] Windows smoke / embedding verification (GitHub Actions: `theia-windows-smoke`, includes `rpc:smoke`)

## 3. Documentation
- [x] Update Task 011 card (`openspec/specs/sprint-theia-migration/task_cards/p2/011-embedding-migration.md`)
- [x] Update API contract error codes spec (`openspec/specs/api-contract/spec.md`)
- [x] Update roadmap/status sync (`openspec/specs/writenow-spec/spec.md`)
- [ ] Update `openspec/_ops/task_runs/ISSUE-153.md` with full evidence (CPU flags, model asset selection, timings, Linux+Windows results)

