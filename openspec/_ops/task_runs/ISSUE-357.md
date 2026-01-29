# ISSUE-357

> fix(e2e): sync WN_E2E bridge RPC with connectionManager

- Issue: #357
- Branch: task/357-e2e-bridge-rpc-sync
- PR: <fill-after-created>

## Plan

- Fix `__WN_E2E__` bridge to use `connectionManager` (same SSOT as UI `useRpcConnection`)
- Ensure E2E invoke path cannot observe “已连接” while RPC returns “Not connected to backend”

## Runs

### 1. Repro from CI logs (2026-01-29)

- Symptom: `project:bootstrap` returns `ok=false` in `ai-memory-p2-001/002` E2E tests
- Key evidence: `__WN_E2E__` bridge uses legacy `rpcClient.invoke()` while UI connection indicator uses `connectionManager`

### 2. Fix `wnE2eBridge` to use `connectionManager` (2026-01-29)

- Change: `writenow-frontend/src/lib/e2e/wnE2eBridge.ts`
- Key output: `invokeIpc()` now ensures `connectionManager.connect()` and calls `connectionManager.invoke()`

