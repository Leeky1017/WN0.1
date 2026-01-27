# ISSUE-316
- Issue: #316
- Branch: task/316-e2e-write-mode-ci-fixes
- PR: https://github.com/Leeky1017/WN0.1/pull/317

## Plan
- Stabilize `e2e-write-mode` CI (Ubuntu) by:
  - Normalizing AI timeout errors to `TIMEOUT`
  - Making Review Accept non-blocking (best-effort snapshots)
  - Preventing orphan backend / port conflicts after SIGKILL (WM-005)

## Runs
### 2026-01-27 status
- Command: `git status -sb`
- Key output: `M writenow-frontend/electron/main.ts` + `M writenow-frontend/electron/services/backendLauncher.ts` + `M writenow-theia/browser-app/gen-webpack.config.js` + `M writenow-theia/browser-app/gen-webpack.node.config.js`
- Evidence: `writenow-frontend/electron/main.ts`, `writenow-frontend/electron/services/backendLauncher.ts`, `writenow-theia/browser-app/gen-webpack.config.js`, `writenow-theia/browser-app/gen-webpack.node.config.js`

### 2026-01-27 22:28 UTC — Inspect CI artifacts (root-cause)
- Command: `sed -n '1,260p' /tmp/wn-artifacts-315/tmp/writenow-e2e-timeout-HcljNM/logs/main.log`
- Key output: `[ai] run error: ... (UPSTREAM_ERROR) Request timed out.`
- Evidence: `/tmp/wn-artifacts-315/` (downloaded Playwright artifacts from failing run)

### 2026-01-27 22:28 UTC — Build (local) for static validation
- Command: `npm ci && npm run build`
- Key output: `webpack ... compiled successfully` (Theia browser backend built)
- Evidence: `writenow-theia/browser-app/lib/backend/main.js`

- Command: `cd writenow-frontend && npm ci && npm run build:electron`
- Key output: `dist-electron/main/index.cjs` + `dist-electron/preload/index.cjs` + `dist/index.html`
- Evidence: `writenow-frontend/dist-electron/`

### 2026-01-27 22:28 UTC — Revert build-regenerated Theia webpack configs (avoid noise)
- Command: `git restore writenow-theia/browser-app/gen-webpack.config.js writenow-theia/browser-app/gen-webpack.node.config.js`
- Key output: (restored)
- Evidence: `git diff` no longer includes `writenow-theia/browser-app/gen-webpack*.config.js`

### 2026-01-27 22:31 UTC — Typecheck/build after fixes
- Command: `yarn --cwd writenow-theia/writenow-core build`
- Key output: `tsc && yarn run copy-assets`
- Evidence: `writenow-theia/writenow-core/lib/`

- Command: `cd writenow-frontend && npm run build`
- Key output: `tsc -b && vite build` (success)
- Evidence: `writenow-frontend/dist/`

### 2026-01-27 22:34 UTC — Lint/contract gates (local)
- Command: `npm run contract:check`
- Key output: `ipc-contract-sync.js check` (success)
- Evidence: (command exit 0)

- Command: `cd writenow-frontend && npm run lint`
- Key output: `eslint .` (success)
- Evidence: (command exit 0)

### 2026-01-27 22:34 UTC — PR + auto-merge
- Command: `gh pr create --title "[WRITE-MODE-IDE] Fix e2e-write-mode CI failures (#316)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/317`
- Evidence: PR #317

- Command: `gh pr merge --auto --squash 317`
- Key output: `autoMergeRequest.enabledAt=2026-01-27T22:34:02Z`
- Evidence: `gh pr view 317 --json autoMergeRequest,mergeStateStatus`
