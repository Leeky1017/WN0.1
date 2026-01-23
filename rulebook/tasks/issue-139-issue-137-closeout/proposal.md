# Proposal: issue-139-issue-137-closeout

## Why
The Sprint Theia migration work uses Rulebook task folders as the execution checklist and evidence anchor.
Once an Issue is merged, we archive its Rulebook task under `rulebook/tasks/archive/` to keep the active
`rulebook/tasks/` directory focused on in-flight work and reduce noise.

## What Changes
- Move `rulebook/tasks/issue-137-p1-basic-layout/` into `rulebook/tasks/archive/2026-01-23-issue-137-p1-basic-layout/`.
- Leave a PR-linked RUN_LOG for this closeout action.

## Impact
- Affected specs: none
- Affected code: none
- Breaking change: NO
- User benefit: Keeps Rulebook task list clean and makes completed work easier to browse by archive date.
