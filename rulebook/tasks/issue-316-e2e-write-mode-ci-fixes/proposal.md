# Proposal: issue-316-e2e-write-mode-ci-fixes

## Why
The `e2e-write-mode` GitHub Actions workflow (added in #315) is currently failing on Ubuntu runners. This blocks Phase 5 “E2E + 质量门禁” from being a reliable merge gate.

## What Changes
- Fix Write Mode E2E failures and flakiness:
  - Review “Accept” completes reliably (UI transitions out of review mode).
  - TIMEOUT errors are classified as `TIMEOUT` (not `UPSTREAM_ERROR`) per API contract.
  - Electron backend teardown is robust (no orphan processes / port conflicts).
- Keep tests “真实 E2E”：real UI + real persistence + real IPC/RPC; no mock persistence.

## Impact
- Affected code: `writenow-frontend/tests/e2e/write-mode/*`, E2E utilities under `writenow-frontend/tests/e2e/_utils/*`, backend error mapping in `writenow-theia/writenow-core`.
- Breaking change: NO
- User benefit: PRs can rely on `e2e-write-mode` as a stable quality gate with actionable artifacts.

