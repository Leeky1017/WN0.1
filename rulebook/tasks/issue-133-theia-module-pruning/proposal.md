# Proposal: issue-133-theia-module-pruning

## Why
WriteNow is a “creator IDE” and should not ship programmer-oriented IDE modules (terminal/debug/git/problems/tasks/plugin system). Pruning these modules reduces bundle size, startup time, UX noise, and the surface area for failures during the Theia migration.

## What Changes
- Remove Theia IDE-only modules from `writenow-theia/browser-app` + `writenow-theia/electron-app` dependencies (and related native rebuild modules).
- Reinstall dependencies and verify both Browser + Electron targets still start and core workflows remain usable.
- Record before/after module lists and any measurable size delta in `openspec/_ops/task_runs/ISSUE-133.md`.

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/spec.md`
  - `openspec/specs/sprint-theia-migration/task_cards/p1/005-module-pruning.md`
- Affected code:
  - `writenow-theia/browser-app/package.json`
  - `writenow-theia/electron-app/package.json`
  - `writenow-theia/yarn.lock`
  - (possibly) `writenow-theia/README.md`
- Breaking change: NO (removes non-target IDE features from the new Theia shell)
- User benefit: Smaller and simpler app (fewer panels/entrypoints), faster startup, fewer failure modes.
