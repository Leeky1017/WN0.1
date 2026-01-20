# ISSUE-29
- Issue: #29
- Branch: task/29-sprint-3-rag-impl
- PR: https://github.com/Leeky1017/WN0.1/pull/38

## Goal
- Deliver Sprint 3 “智能上下文”基础设施：FTS5 + 本地 Embedding + sqlite-vec + 最小可复用 RAG（人物/设定优先），并补齐真实 E2E 证据链。

## Status
- CURRENT: Implementation complete; E2E green; ready to commit + open PR + enable auto-merge.

## Next Actions
- [ ] Commit changes with `(#29)`
- [ ] Push branch `task/29-sprint-3-rag-impl`
- [ ] Create PR (body includes `Closes #29`) and enable auto-merge
- [ ] Watch required checks (`ci`/`openspec-log-guard`/`merge-serial`) to green
- [ ] Backfill `PR:` link in this RUN_LOG and archive Rulebook task

## Decisions Made
- 2026-01-20 Use Electron main-process IPC as the minimal integration surface (API contract: `search:*`, `embedding:*`), keeping UI changes optional for Sprint 3.
- 2026-01-20 Use `onnx/model_qint8_avx512_vnni.onnx` for `text2vec-base-chinese` to avoid opset incompatibility in `onnx/model_O4.onnx`.
- 2026-01-20 Replace Node global `fetch` inside embedding worker with `https`-based fetch to improve model download reliability (plus HF mirror fallback for downloads).
- 2026-01-20 Make Sprint 3 E2E tests IPC-first (no UI dependency) to improve determinism.

## Errors Encountered
- 2026-01-20 Embedding load failures (opset mismatch) → switched from `model_O4.onnx` to `model_qint8_avx512_vnni.onnx`.
- 2026-01-20 E2E instability due to UI strict-mode locators/timeouts → refactored E2E to drive IPC directly.

## Runs
### 2026-01-20 00:00 bootstrap
- Command:
  - `gh issue create -t "[SPRINT-03] 智能上下文（RAG）: Implementation" -b "..."`
- Key output:
  - `https://github.com/Leeky1017/WN0.1/issues/29`
- Evidence:
  - `openspec/_ops/task_runs/ISSUE-29.md`

### 2026-01-20 07:15 e2e
- Command:
  - `npm run test:e2e -- --reporter=line`
- Key output:
  - `4 passed (12.5s)`
- Evidence:
  - `tests/e2e/app-launch.spec.ts`
  - `tests/e2e/sprint-3-rag.spec.ts`
