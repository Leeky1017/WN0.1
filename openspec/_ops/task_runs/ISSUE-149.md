# ISSUE-149
- Issue: #149
- Branch: task/149-theia-rag-migration
- PR: <fill-after-created>

## Goal
- Migrate the RAG pipeline (chunking/indexer/retrieval + sqlite-vec vector store) into Theia backend, building on the Task 009 SQLite layer, and expose it via Theia RPC with observable failures.

## Plan
- Port `electron/lib/rag/*` + `electron/lib/vector-store.cjs` into `writenow-theia/writenow-core/src/node/rag/*` and a backend service layer.
- Provide explicit index entrypoints (indexArticle/indexProject) and retrieval entrypoints (retrieveContext/searchEntities).
- Verify indexing writes chunk rows + vec tables; verify retrieval returns explainable results (FTS keyword recall + semantic recall when embedding is available).

## Status
- CURRENT: Implemented RAG chunking/indexer/retrieval + sqlite-vec vector store in Theia backend; validating via rpc-smoke and updating docs.

## Next Actions
- [ ] Run CI-equivalent local checks (openspec validate + contract:check).
- [ ] Update task card + writenow-spec status, then open PR with auto-merge.
- [ ] Archive Rulebook task after merge.

## Decisions Made
- 2026-01-24: Implement semantic retrieval guarded behind `MODEL_NOT_READY` when embedding service is not available (Task 011 dependency), but keep FTS keyword recall always available.

## Errors Encountered
- 2026-01-24: `yarn install` at `writenow-theia/` failed building `native-keymap` due to missing `pkg-config`/X11 headers in this environment. Workaround: install/build only `writenow-theia/writenow-core` (enough to compile + run rpc-smoke).
- 2026-01-24: Initial RAG rpc-smoke assertion failed because `rag:retrieve` intentionally filters entity-card source articles from passages; fixed by ensuring a non-card article mentions the entity (matches production behavior).

## Runs
### 2026-01-24 13:16 Install (Theia workspace) — FAILED (native-keymap)
- Command: `yarn --cwd writenow-theia install --frozen-lockfile`
- Key output: `error .../node_modules/native-keymap: Command failed. ... /bin/sh: 1: pkg-config: not found`
- Evidence: `openspec/_ops/task_runs/ISSUE-149.md` (this entry) + terminal output

### 2026-01-24 13:18 Build (Theia core)
- Command: `yarn --cwd writenow-theia/writenow-core build`
- Key output: `Done in 1.99s.`
- Evidence: `writenow-theia/writenow-core/lib/**`

### 2026-01-24 13:22 Verify (RPC smoke: DB + CRUD + RAG + sqlite-vec)
- Command: `yarn --cwd writenow-theia/writenow-core rpc:smoke`
- Key output: `[rpc-smoke] ok { ... rag: { passages: 2, characters: 1, vecHits: 1 } ... }`
- Evidence: `writenow-theia/writenow-core/scripts/rpc-smoke.cjs`

### 2026-01-24 13:24 OpenSpec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
- Evidence: `openspec/specs/**` + task card updates

### 2026-01-24 13:24 IPC contract check
- Command: `npm run contract:check`
- Key output: `node scripts/ipc-contract-sync.js check`
- Evidence: `src/types/ipc-generated.ts` + `writenow-theia/writenow-core/src/common/ipc-generated.ts`
