## 1. Investigation
- [ ] 1.1 Reproduce CI failures locally (Ubuntu-like) with `npx playwright test -g "@write-mode"` and collect trace/screenshot/log evidence.
- [ ] 1.2 Identify root cause(s) for:
  - Accept flow not leaving review mode
  - TIMEOUT misclassification
  - backend exit/worker teardown timeout

## 2. Implementation
- [ ] 2.1 Fix review accept completion so UI reliably exits review mode (bounded timeouts; observable error if it fails).
- [ ] 2.2 Normalize AI timeout mapping to stable `TIMEOUT` code (per `openspec/specs/api-contract/spec.md`).
- [ ] 2.3 Harden E2E teardown to prevent orphaned backend processes and CI worker-timeout stalls.

## 3. Testing
- [ ] 3.1 Run `npx playwright test -g "@write-mode"` locally and capture key output in RUN_LOG.
- [ ] 3.2 Verify GitHub Actions `e2e-write-mode` check is green on the PR.

## 4. Documentation
- [ ] 4.1 Append key commands/outputs and links to failing/passing CI runs to `openspec/_ops/task_runs/ISSUE-316.md`.

