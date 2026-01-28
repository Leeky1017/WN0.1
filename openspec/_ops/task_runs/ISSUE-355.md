# ISSUE-355

> fix(rpc): use connectionManager instead of rpcClient for invoke

- Issue: #355
- Branch: task/355-rpc-use-connectionmanager
- PR: https://github.com/Leeky1017/WN0.1/pull/356

## Problem

Screenshot from failed E2E test showed file tree displaying "Not connected to backend" while status bar showed "已连接".

Root cause: `api.ts`'s `invoke()` was using the legacy `rpcClient` which has its own connection state, while `useRpcConnection` uses the new `connectionManager`. They were not synchronized.

## Solution

Update `api.ts` to use `connectionManager.invoke()` instead of `rpcClient.invoke()`.

## Runs

### 1. Discovered root cause from test screenshot (2026-01-28)

- Command: `gh run download 21451634194 --name playwright-perf-artifacts`
- Key output: Screenshot shows "Not connected to backend" in file tree while status bar shows "已连接"
- Evidence: Two separate connection systems out of sync

### 2. Applied fix to api.ts (2026-01-28)

- Command: Edit `writenow-frontend/src/lib/rpc/api.ts`
- Key output: Changed import from `rpcClient` to `connectionManager`, updated `invoke()` to use `connectionManager.invoke()`
- Evidence: Code change in this PR
