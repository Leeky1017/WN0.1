# ISSUE-153
- Issue: #153
- Branch: task/153-embedding-migration
- PR: <fill-after-created>

## Goal
- Migrate Embedding service into Theia backend (worker + model assets) and unblock RAG semantic retrieval end-to-end.

## Plan
- Port legacy Electron embedding service/worker/model downloader into `writenow-theia/writenow-core/src/node/embedding/`.
- Add EmbeddingService RPC contract + backend service and integrate into RAG index/retrieval paths.
- Extend `yarn rpc:smoke` to validate embedding + semantic search, and record Linux + Windows validation evidence.

## Runs
### 2026-01-24 00:00 Issue + worktree
- Command: `gh issue create -t "[SPRINT-THEIA-MIGRATION] Phase 2 / Task 011: Embedding migration (service + worker + RAG semantic search backtest)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/153`
- Command: `git worktree add -b "task/153-embedding-migration" ".worktrees/issue-153-embedding-migration" origin/main`
- Key output: `Preparing worktree (new branch 'task/153-embedding-migration')`

### 2026-01-24 15:00 IPC contract: add ENCODING_FAILED + regenerate
- Command: `npm run contract:generate`
- Key output: generated `src/types/ipc-generated.ts` + `writenow-theia/writenow-core/src/common/ipc-generated.ts` with `ENCODING_FAILED`
- Evidence:
  - `electron/ipc/contract/ipc-contract.cjs`
  - `src/types/ipc-generated.ts`
  - `writenow-theia/writenow-core/src/common/ipc-generated.ts`

### 2026-01-24 15:05 Theia deps: install transformers (workspace)
- Command: `yarn --cwd writenow-theia install --ignore-scripts`
- Key output: `success Saved lockfile.`
- Evidence:
  - `writenow-theia/writenow-core/package.json` (adds `@xenova/transformers`)
  - `writenow-theia/yarn.lock`

### 2026-01-24 15:10 CPU flags (ONNX compatibility context)
- Command: `uname -a && grep -m1 -i '^flags' /proc/cpuinfo | egrep 'avx|avx2|avx512'`
- Key output:
  - `Linux ... x86_64 GNU/Linux`
  - CPU flags include `avx`, `avx2`, `avx_vnni` (no `avx512f` / `avx512vnni`)

### 2026-01-24 15:12 Linux: model cache verification (downloaded assets)
- Command: `ls -lh /tmp/writenow-theia-rpc-smoke-*/models/shibing624/text2vec-base-chinese/{config.json,tokenizer.json} ...`
- Key output:
  - `onnx/model.onnx` present (389M)
  - tokenizer + config files present
- Evidence:
  - `/tmp/writenow-theia-rpc-smoke-hHR5jj/models/shibing624/text2vec-base-chinese/onnx/model.onnx`

### 2026-01-24 15:13 Linux: embedding + semantic retrieval E2E (rpc-smoke)
- Command: `yarn --cwd writenow-theia/writenow-core rpc:smoke`
- Key output:
  - `[rpc-smoke] embedding ok { ms: 50020, dim: 768, sim01: 0.83..., sim02: 0.30..., onnxSelected: 'model.onnx' }`
  - `[rpc-smoke] ok { ... rag: { passages: 2, characters: 1, vecHits: 1 }, semanticOnly: { passages: 4 } }`
- Evidence:
  - `writenow-theia/writenow-core/scripts/rpc-smoke.cjs` (embedding + semantic + timeout assertions)

### 2026-01-24 15:15 Local gates
- Command: `npm run contract:check`
- Key output: exit 0
- Command: `npm run lint`
- Key output: `0 errors (warnings only)`
- Command: `npm run build`
- Key output: `✓ built in ...s`
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`

### 2026-01-24 15:20 Windows verification (pending)
- Command: `gh workflow run theia-windows-smoke.yml --ref task/153-embedding-migration`
- Key output: pending
