# ISSUE-319
- Issue: #319
- Branch: task/319-e2e-write-mode-ci-stabilize
- PR: <fill-after-created>

## Plan
- Stabilize `e2e-write-mode` CI by fixing flake sources (Review Accept, crash recovery, teardown).
- Keep tests “真实 E2E”：real UI + real persistence + real IPC/RPC; no stub persistence.

## Runs
### 2026-01-28 00:20 UTC — Init
- Command: `gh issue view 319 --json url,state,title`
- Key output: `state=OPEN`
- Evidence: https://github.com/Leeky1017/WN0.1/issues/319

### 2026-01-28 00:26 UTC — Inspect failing `e2e-write-mode` run on main
- Command: `gh run view 21418614813 --log-failed`
- Key output: Worker teardown timeout; WM-003 Accept keeps `wm-review-root` visible; WM-005 `firstWindow` timeout.
- Evidence: https://github.com/Leeky1017/WN0.1/actions/runs/21418614813

- Command: `gh run download 21418614813 -n playwright-write-mode-artifacts -D /tmp/wn-artifacts-319`
- Key output: downloaded Playwright artifacts (trace/screenshot + per-test `main.log`)
- Evidence: `/tmp/wn-artifacts-319/` (local)

- Command: `cat /tmp/wn-artifacts-319/tmp/writenow-e2e-recover-9LD3EB/logs/main.log`
- Key output: `[backend] port 3000 in use; waiting for release`
- Evidence: `/tmp/wn-artifacts-319/tmp/writenow-e2e-recover-9LD3EB/logs/main.log`

### 2026-01-28 00:40 UTC — Spec-first: validate Rulebook task
- Command: `rulebook task validate issue-319-e2e-write-mode-ci-stabilize`
- Key output: `✅ Task issue-319-e2e-write-mode-ci-stabilize is valid` (warning: no spec files)
- Evidence: `rulebook/tasks/issue-319-e2e-write-mode-ci-stabilize/`

### 2026-01-28 00:45 UTC — Local gates (contract)
- Command: `npm run contract:check`
- Key output: exit 0
- Evidence: `scripts/ipc-contract-sync.js`

### 2026-01-28 00:48 UTC — Local gates (frontend deps + lint + builds)
- Command: `cd writenow-frontend && npm ci`
- Key output: `added 910 packages` (warnings only)
- Evidence: `writenow-frontend/package-lock.json`

- Command: `cd writenow-frontend && npm run lint`
- Key output: exit 0
- Evidence: `writenow-frontend/src/features/ai-panel/useAISkill.ts`

- Command: `cd writenow-frontend && npm run build`
- Key output: `✓ built` (vite) + `tsc -b` success
- Evidence: `writenow-frontend/dist/`

- Command: `cd writenow-frontend && npm run build:electron`
- Key output: `dist-electron/*` built
- Evidence: `writenow-frontend/dist-electron/`

### 2026-01-28 00:52 UTC — Local gates (repo deps + Theia build)
- Command: `npm ci`
- Key output: `up to date, audited 1 package`
- Evidence: `package-lock.json`

- Command: `npm run build`
- Key output: `webpack ... compiled successfully` (warnings only)
- Evidence: `writenow-theia/browser-app/`
