# Proposal: issue-144-issue-141-closeout

## Why
The Sprint Theia migration work uses Rulebook task folders as the execution checklist and evidence anchor.
Once an Issue is merged, we archive its Rulebook task under `rulebook/tasks/archive/` to keep the active
`rulebook/tasks/` directory focused on in-flight work and reduce noise.

## What Changes
- Move `rulebook/tasks/issue-141-ipc-migration/` into `rulebook/tasks/archive/2026-01-23-issue-141-ipc-migration/`.
- Keep a PR-linked RUN_LOG for this closeout action.

## Impact
- Affected specs: none
- Affected code: none
- Breaking change: NO
- User benefit: Keeps Rulebook task list clean and makes completed work easier to browse by archive date.
