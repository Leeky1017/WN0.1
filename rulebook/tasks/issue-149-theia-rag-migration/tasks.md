## 1. Implementation
- [x] 1.1 Port chunking + entity parsing to `writenow-core/src/node/rag/*`
- [x] 1.2 Port sqlite-vec vector store (vec0 table management + queries)
- [x] 1.3 Port indexer (chunk writes + entity cards + vec upserts; guarded when embedding is missing)
- [x] 1.4 Port retrieval (entity recall + passages recall + budget control; keyword recall always available)
- [x] 1.5 Expose index/retrieval services via Theia RPC and keep failures observable (`IpcResponse` codes, logs)

## 2. Testing
- [x] 2.1 Update/extend Theia rpc-smoke (or add dedicated script) to verify:
  - indexing creates `article_chunks` rows
  - sqlite-vec tables exist and can be queried
  - retrieval returns passages/entity hits (FTS keyword recall)
  - semantic retrieval returns `MODEL_NOT_READY` when embedding is unavailable
- [ ] 2.2 Run repo CI gates locally (`openspec validate`, `npm run contract:check`, `npm run lint`, `npm run build`) (note: openspec + contract verified locally; lint/build rely on CI)
- [x] 2.3 Run `writenow-theia/writenow-core` build + verification script locally (evidence in RUN_LOG)

## 3. Documentation
- [x] 3.1 Update task card `010-rag-migration.md` acceptance checkboxes + completion metadata
- [x] 3.2 Update `openspec/specs/writenow-spec/spec.md` status sync after merge
