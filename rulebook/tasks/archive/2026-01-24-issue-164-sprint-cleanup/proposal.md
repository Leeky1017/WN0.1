# Proposal: issue-164-sprint-cleanup

## Why
Sprint Theia Migration is complete, but the repository still contains legacy/duplicate implementations (`theia-poc/`, legacy React UI under `src/`, and migrated Electron main-process code).
Keeping both stacks increases onboarding confusion, wastes CI time, and raises contract-drift risk.

## What Changes
- Delete `theia-poc/` (PoC code fully superseded by `writenow-theia/`).
- Reduce `src/` to only reusable shared assets (types/locales/context); remove legacy UI/state/entrypoints.
- Audit `electron/` for runtime usage by `writenow-theia/`:
  - remove fully migrated parts;
  - keep still-referenced parts, but document why + follow-up TODOs.
- Update `package.json` scripts/entrypoints to be Theia-first and prune unused dependencies.
- Update docs/specs to clearly state Theia-only baseline and mark old frontend specs as deprecated.

## Impact
- Affected specs:
  - `openspec/specs/writenow-spec/spec.md`
  - `openspec/specs/wn-frontend-deep-remediation/spec.md`
  - `openspec/specs/sprint-theia-migration/task_cards/p3/012-ai-panel-widget.md`
- Affected code:
  - Remove: `theia-poc/`, legacy `src/components|stores|pages|views|App.tsx|main.tsx` (exact list recorded in RUN_LOG)
  - Potentially reduce: migrated parts of `electron/` (kept parts explicitly justified)
  - Update: `package.json`
- Breaking change: YES (legacy dev entrypoints/scripts removed; baseline becomes Theia-only)
- User benefit: faster CI + clearer baseline + lower drift risk + simpler onboarding.
