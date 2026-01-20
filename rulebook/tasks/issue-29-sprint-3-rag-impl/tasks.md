## 1. Implementation
- [ ] 1.1 Implement DB migrations for Sprint 3 schema (FTS5 + sqlite-vec tables)
- [ ] 1.2 Wire document lifecycle to indexing (save/delete → FTS + vectors)
- [ ] 1.3 Implement `search:fulltext` IPC (Paginated, snippets, errors)
- [ ] 1.4 Implement embedding service + `embedding:encode` IPC (offline-capable, observable errors)
- [ ] 1.5 Implement vector store + `embedding:index` + `search:semantic` IPC (topK, dimension checks)
- [ ] 1.6 Implement minimal RAG retrieval + entities recall (characters/settings first, budget control)

## 2. Testing
- [ ] 2.1 Add Playwright E2E for fulltext search after save/update/delete
- [ ] 2.2 Add Playwright E2E for embedding encode + semantic search + dimension mismatch path
- [ ] 2.3 Add Playwright E2E for RAG retrieval (entities + evidence + budget)
- [ ] 2.4 Run `npm test` and `npm run test:e2e`

## 3. Documentation
- [ ] 3.1 Update `openspec/_ops/task_runs/ISSUE-29.md` with commands + key outputs
- [ ] 3.2 Create PR with `Closes #29` and enable auto-merge
