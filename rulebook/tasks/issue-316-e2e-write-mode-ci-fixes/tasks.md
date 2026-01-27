## 1. Investigation
- [ ] 1.1 Reproduce CI failures locally (Ubuntu-like) with `npx playwright test -g "@write-mode"` and collect trace/screenshot/log evidence.
- [x] 1.2 Identify root cause(s) from CI logs/artifacts for:
  - WM-002 focus-mode width assertions racing UI transitions
  - WM-003 accept not clearing `wm-review-root` (editor diff session not applied / selection drift)
  - WM-005 relaunch `firstWindow` timeout (startup blocked by port conflict / teardown issues)
  - Worker teardown timeout (orphan Electron/backend processes)

## 2. Implementation
- [ ] 2.1 Fix review accept completion so UI reliably exits review mode (bounded timeouts; observable error if it fails).
- [x] 2.2 Normalize AI timeout mapping to stable `TIMEOUT` code (per `openspec/specs/api-contract/spec.md`).
- [x] 2.3 Harden E2E teardown to prevent orphaned backend processes and CI worker-timeout stalls.
- [x] 2.4 Make AI diff preview/apply robust against benign selection drift (normalize comparisons) and avoid showing Review UI unless the editor diff session is active.
- [x] 2.5 Stabilize Focus Mode E2E by waiting for panel collapse transitions (or disabling animations under `WN_E2E`).

## 3. Testing
- [ ] 3.1 Run `npx playwright test -g "@write-mode"` locally and capture key output in RUN_LOG.
- [ ] 3.2 Verify GitHub Actions `e2e-write-mode` check is green on the PR.

## 4. Documentation
- [ ] 4.1 Append key commands/outputs and links to failing/passing CI runs to `openspec/_ops/task_runs/ISSUE-316.md`.
