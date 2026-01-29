# ISSUE-357

> fix(e2e): sync WN_E2E bridge RPC with connectionManager

- Issue: #357
- Branch: task/357-e2e-bridge-rpc-sync
- PR: https://github.com/Leeky1017/WN0.1/pull/358

## Plan

- Fix `__WN_E2E__` bridge to use `connectionManager` (same SSOT as UI `useRpcConnection`)
- Ensure E2E invoke path cannot observe “已连接” while RPC returns “Not connected to backend”

## Runs

### 1. Repro from CI logs (2026-01-29)

- Command: `gh run view 21452153666 --log | grep -A 20 "Error:"`
- Key output: `project:bootstrap` returns `ok=false` with "Not connected to backend"
- Evidence: Screenshot shows UI "已连接" but E2E bridge uses legacy `rpcClient.invoke()` while UI uses `connectionManager`

### 2. Fix `wnE2eBridge` to use `connectionManager` (2026-01-29)

- Command: `edit writenow-frontend/src/lib/e2e/wnE2eBridge.ts`
- Key output: `invokeIpc()` now ensures `connectionManager.connect()` and calls `connectionManager.invoke()`
- Evidence: Code diff in PR #358

