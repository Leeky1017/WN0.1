## 1. Implementation
- [ ] 1.1 Capture baseline (before) module list + size metrics for `writenow-theia/` (deps + du output).
- [ ] 1.2 Remove IDE-only Theia modules from `browser-app` + `electron-app` deps; update rebuild scripts accordingly; run install.
- [ ] 1.3 Verify Browser + Electron targets start and `writenow-core` extension loads.

## 2. Testing
- [ ] 2.1 Add/adjust E2E (or the repo’s Theia smoke harness) to assert IDE-only UI entrypoints are absent (terminal/debug/git/problems/tasks).
- [ ] 2.2 Run the E2E gate(s) locally and record outputs in RUN_LOG.

## 3. Documentation
- [ ] 3.1 Update `openspec/_ops/task_runs/ISSUE-133.md` with commands + key outputs for prune/install/start.
- [ ] 3.2 Update task card `openspec/specs/sprint-theia-migration/task_cards/p1/005-module-pruning.md` (metadata + acceptance checkmarks).
- [ ] 3.3 Update `writenow-theia/README.md` if any local dev commands or prerequisites change.
