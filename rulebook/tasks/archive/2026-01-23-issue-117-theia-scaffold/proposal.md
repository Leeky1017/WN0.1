# Proposal: issue-117-theia-scaffold

## Why
Phase 1 needs a production-grade Theia application scaffold (`writenow-theia/`) as the base for all follow-up migration tasks (widgets, backend services, IPC→RPC), with reproducible build/run entrypoints and cross-platform (Linux + Windows) native-module validation.

## What Changes
- Add a new Theia workspace under `writenow-theia/` (browser + electron targets) generated from `generator-theia-extension`, plus a minimal core extension package (`writenow-core`).
- Implement a minimal frontend contribution (command/menu) and backend contribution (startup logs + native module load checks).
- Document dev/build/start commands and platform-specific notes in `writenow-theia/README.md`.
- Add a RUN_LOG with Linux + Windows validation evidence; update the Phase 1 task card and (if applicable) roadmap progress in `writenow-spec`.

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/spec.md`
  - `openspec/specs/sprint-theia-migration/task_cards/p1/004-theia-scaffold.md`
  - `openspec/specs/writenow-spec/spec.md` (roadmap/progress sync after merge)
- Affected code:
  - `writenow-theia/**` (new)
  - `openspec/_ops/task_runs/ISSUE-117.md` (new)
  - `rulebook/tasks/issue-117-theia-scaffold/**`
- Breaking change: NO (additive; existing app remains unchanged)
- User benefit: Provides a stable, reproducible Theia foundation (browser + electron) for the migration, including early cross-platform native module validation.
