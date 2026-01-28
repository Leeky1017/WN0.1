# ISSUE-353

> fix(e2e): guard handleChange in useBreakpoint useEffect

- Issue: #353
- Branch: task/353-usebreakpoint-handlechange-fix
- PR: https://github.com/Leeky1017/WN0.1/pull/354

## Plan

- Fix the `handleChange` function in `useBreakpoint` to guard against `window.innerWidth === 0`
- This is a follow-up to #351 which only fixed `getInitialWidth()` but missed `handleChange()`

## Runs

### 1. Identify missing fix (2026-01-28)

- Command: `git show origin/main:writenow-frontend/src/lib/responsive/useBreakpoint.ts`
- Key output: `handleChange` still directly uses `window.innerWidth` without guard
- Evidence: PR #352 was merged before the additional fix was pushed

### 2. Apply fix to handleChange (2026-01-28)

- Command: Edit `writenow-frontend/src/lib/responsive/useBreakpoint.ts`
- Key output: Added guard `if (currentWidth > 0)` in `handleChange` function
- Evidence: Code change in this PR

### 3. Discovered real root cause from screenshot (2026-01-28)

- Command: `gh run download 21451634194 --name playwright-perf-artifacts`
- Key output: Screenshot shows file tree displays "Not connected to backend" even though status bar shows "已连接"
- Evidence: Connection state desync between `connectionManager` and `rpcClient`

### 4. Fixed RPC client to use connectionManager (2026-01-28)

- Command: Edit `writenow-frontend/src/lib/rpc/api.ts`
- Key output: Changed `invoke` to use `connectionManager.invoke` instead of `rpcClient.invoke`
- Evidence: This fixes the race condition where `useRpcConnection.isConnected` reports true but actual RPC calls fail
