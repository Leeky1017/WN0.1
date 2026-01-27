# Proposal: issue-310-ci-fix-electron-sandbox

## Why
The `e2e-perf` GitHub Actions workflow cannot launch Electron on `ubuntu-latest` because Chromium aborts when the SUID sandbox helper exists but is not configured (`chrome-sandbox` is not owned by root / not mode 4755). This blocks E2E gates and makes perf budgets unenforceable.

## What Changes
Update the shared Playwright Electron launcher helper to pass `--no-sandbox` and `--disable-setuid-sandbox` on Linux.

## Impact
- Affected specs: none
- Affected code: `writenow-frontend/tests/e2e/_utils/writenow.ts`
- Breaking change: NO (test-only helper)
- User benefit: CI E2E runs become reliable; perf budgets can gate regressions.
