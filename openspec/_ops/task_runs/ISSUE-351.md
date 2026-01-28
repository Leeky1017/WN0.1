# ISSUE-351

> fix(e2e): responsive breakpoint causing sidebar not to render in CI

- Issue: #351
- Branch: task/351-e2e-responsive-fix
- PR: https://github.com/Leeky1017/WN0.1/pull/352

## Plan

- Identify root cause of E2E test failures after PR #349
- Fix useBreakpoint hook to handle `window.innerWidth === 0` during Electron startup
- Update xvfb resolution in CI workflows to 1920x1080x24
- Create PR with proper issue linkage

## Runs

### 1. Root cause analysis (2026-01-28)

- Command: `gh run view 21450348788 --log 2>&1 | grep -A 50 "Error:"`
- Key output: `Error: expect(locator).toBeVisible() failed` at `_utils/writenow.ts:109` - treeitem not found in sidebar
- Evidence: CI run https://github.com/Leeky1017/WN0.1/actions/runs/21450348788

### 2. Analysis of responsive logic (2026-01-28)

- Command: `git diff 63930b2..95984ec -- writenow-frontend/src/components/layout/AppShell.tsx`
- Key output: PR #349 introduced `isMobile` check: `const isSidebarOpen = isMobile ? false : (!sidebarCollapsed && !focusMode)`
- Evidence: When `isMobile === true`, sidebar is hidden and mobile overlay is used instead

### 3. Identified breakpoint initialization issue (2026-01-28)

- Command: Read `writenow-frontend/src/lib/responsive/useBreakpoint.ts`
- Key output: `getInitialWidth()` returns `window.innerWidth` directly, which can be 0 during Electron startup
- Evidence: 0 < 768 → `isMobile = true` → sidebar hidden → test fails

### 4. Applied fix to useBreakpoint (2026-01-28)

- Command: Edit `writenow-frontend/src/lib/responsive/useBreakpoint.ts`
- Key output: Added fallback to BREAKPOINTS.tablet when `window.innerWidth <= 0`
- Evidence: Code change in this PR

### 5. Updated xvfb resolution in CI workflows (2026-01-28)

- Command: Edit `.github/workflows/e2e-perf.yml` and `e2e-write-mode.yml`
- Key output: Changed `xvfb-run -a` to `xvfb-run -a -s "-screen 0 1920x1080x24"`
- Evidence: Workflow changes in this PR
