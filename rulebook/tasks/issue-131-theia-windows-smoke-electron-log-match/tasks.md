## 1. Implementation
- [ ] 1.1 Fix Windows smoke electron step to search for frontend marker via literal match (no regex pitfalls).
- [ ] 1.2 Assert backend native smoke success marker to validate better-sqlite3 + sqlite-vec load on Windows.

## 2. Testing
- [ ] 2.1 Trigger `theia-windows-smoke` via workflow_dispatch and ensure it passes.
- [ ] 2.2 Capture key output lines / run URL as evidence for the RUN_LOG.

## 3. Documentation
- [ ] 3.1 Update `openspec/_ops/task_runs/ISSUE-131.md` with commands, key output, and links to workflow runs/logs.
