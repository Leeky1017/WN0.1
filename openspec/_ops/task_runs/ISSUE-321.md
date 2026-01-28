# ISSUE-321
- Issue: #321
- Branch: task/321-e2e-write-mode-flake-fixes
- PR: https://github.com/Leeky1017/WN0.1/pull/323

## Plan
- 修复 `e2e-write-mode` flake：Review Accept 清理确定性 + E2E teardown/端口释放兜底。
- 本地跑必要门禁并记录证据；推送 PR 后在 CI 上迭代直到 `e2e-write-mode` 跑绿并合并。

## Runs
### 2026-01-28 01:20 UTC — Inspect failing CI run + artifacts
- Command: `gh run view 21420469086 --log-failed`
- Key output: `WM-003 expect(wm-review-root).toBeHidden failed (visible)`; `WM-005 firstWindow timeout + [backend] port 3000 in use`
- Evidence: https://github.com/Leeky1017/WN0.1/actions/runs/21420469086

### 2026-01-28 01:22 UTC — Download Playwright artifacts for diagnosis
- Command: `gh run download 21420469086 -D /tmp/wn-artifacts-21420469086`
- Key output: downloaded `playwright-write-mode-artifacts` (screenshots + trace.zip + per-test main.log)
- Evidence: `/tmp/wn-artifacts-21420469086/`

### 2026-01-28 01:28 UTC — Spec-first paperwork (Rulebook task)
- Command: `rulebook task create issue-321-e2e-write-mode-flake-fixes && rulebook task validate issue-321-e2e-write-mode-flake-fixes`
- Key output: `✅ Task issue-321-e2e-write-mode-flake-fixes is valid`
- Evidence: `rulebook/tasks/issue-321-e2e-write-mode-flake-fixes/`

### 2026-01-28 01:31 UTC — Local gate: contract check
- Command: `npm run contract:check`
- Key output: exit 0
- Evidence: `scripts/ipc-contract-sync.js`

### 2026-01-28 01:32 UTC — Local gate: frontend deps + lint + builds
- Command: `cd writenow-frontend && npm ci`
- Key output: `added 910 packages` (warnings: EBADENGINE; vulnerabilities reported by npm audit)
- Evidence: `writenow-frontend/package-lock.json`

- Command: `cd writenow-frontend && npm run lint`
- Key output: exit 0
- Evidence: `writenow-frontend/eslint.config.js`

- Command: `cd writenow-frontend && npm run build`
- Key output: `✓ built` (vite) + `tsc -b` success
- Evidence: `writenow-frontend/dist/`

- Command: `cd writenow-frontend && npm run build:electron`
- Key output: `dist-electron/*` built
- Evidence: `writenow-frontend/dist-electron/`

### 2026-01-28 01:35 UTC — Local sanity: Playwright command (WSL skip)
- Command: `cd writenow-frontend && npx playwright test -g "@write-mode" --reporter=line`
- Key output: `8 skipped` (WSL 环境跳过；CI 作为真实门禁验证)
- Evidence: `writenow-frontend/tests/e2e/write-mode/*.spec.ts`

### 2026-01-28 03:13 UTC — CI re-run on PR #322 still failing
- Command: `gh run view 21423330925 --log-failed`
- Key output: `WM-003 wm-review-root still visible after Accept`; `WM-005 treeitem exact name match failed (element(s) not found)`
- Evidence: https://github.com/Leeky1017/WN0.1/actions/runs/21423330925

### 2026-01-28 03:15 UTC — Download artifacts for failing run
- Command: `gh run download 21423330925 -D /tmp/wn-artifacts-21423330925`
- Key output: downloaded `playwright-write-mode-artifacts` (screenshots + trace.zip + per-test main.log)
- Evidence: `/tmp/wn-artifacts-21423330925/`

### 2026-01-28 03:22 UTC — Patch + local rebuild
- Command: `cd writenow-frontend && npm run lint && npm run build && npm run build:electron`
- Key output: lint/build success
- Evidence: `writenow-frontend/dist/`, `writenow-frontend/dist-electron/`

