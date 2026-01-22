# Proposal: issue-106-theia-migration-spec

## Why
WriteNow has decided (2026-01-22) to migrate from the current custom Electron+React app architecture to Eclipse Theia for a more reliable, modular, and industry-proven IDE framework. We need a sprint-level OpenSpec to make the migration executable (PoCs → scaffold → core migrations) and to pause conflicting specs to avoid roadmap drift.

## What Changes
- Commit the existing Theia migration reusability evaluation doc (`CODEBASE_REUSABILITY_VIEWPOINT.md`) and clean up the current local working tree changes.
- Add a new sprint spec: `openspec/specs/sprint-theia-migration/` (spec + design docs + task cards) as the authoritative plan for migration.
- Annotate existing specs/tasks as paused where they conflict with the Theia migration decision.

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/**` (new)
  - `openspec/specs/wn-frontend-deep-remediation/**` (status: paused)
  - `openspec/specs/sprint-ide-advanced/**` (status: paused)
  - `openspec/specs/skill-system-v2/**` (tasks 004-010 paused annotations)
  - `openspec/specs/writenow-spec/spec.md` (roadmap notes, if needed for drift control)
- Affected code: none (this change is specification/documentation + rulebook only)
- Breaking change: NO (no runtime behavior change)
- User benefit: A clear, risk-driven, testable migration plan to reach an industrial-grade Theia-based WriteNow.
