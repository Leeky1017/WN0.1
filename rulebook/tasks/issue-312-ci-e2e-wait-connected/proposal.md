# Proposal: issue-312-ci-e2e-wait-connected

## Why
`e2e-perf` intermittently fails when attempting to create the first file because the backend connection is not fully established yet. This causes file tree actions to be no-ops and the test to time out waiting for the new entry.

## What Changes
Wait for `wm-connection-indicator` to show `已连接` after the first window loads, before proceeding with E2E interactions. Also relax the file tree item matcher to tolerate trailing accessibility text.

## Impact
- Affected specs: none
- Affected code: `writenow-frontend/tests/e2e/_utils/writenow.ts`
- Breaking change: NO (test-only helper)
- User benefit: More stable CI E2E gates (perf + write-mode) with clearer readiness semantics.
