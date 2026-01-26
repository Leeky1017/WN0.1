# ISSUE-244
- Issue: #244
- Branch: task/244-statsbar-mock-fix
- PR: pending

## Plan
- Fix StatsBar mock data by using StatusBar store

## Runs
### 2026-01-26 18:10 browser-test-discovery
- Command: `browser_navigate http://localhost:5173/`
- Key output: `StatsBar shows "1,234 字" - Mock data!`
- Evidence: Screenshot showing mock data in top stats bar

### 2026-01-26 18:11 fix-statsbar
- Command: `vim src/components/layout/StatsBar.tsx`
- Key output: `Replaced mock defaults with useStatusBarStore`
- Evidence: `writenow-frontend/src/components/layout/StatsBar.tsx`

### 2026-01-26 18:12 verify-fix
- Command: `browser_reload`
- Key output: `StatsBar shows "0 字" - Real data!`
- Evidence: Screenshot showing real data (0) in top stats bar

### 2026-01-26 18:12 lint-build
- Command: `npm run lint && npm run build`
- Key output: `eslint: no errors, vite: built in 7.34s`
- Evidence: `writenow-frontend/dist/`
