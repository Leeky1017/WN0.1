# Proposal: issue-100-issue-89-closeout

## Why
Closeout governance for merged Issue #89: archive its Rulebook task into `rulebook/tasks/archive/` and sync `writenow-spec` roadmap so canonical progress tracking does not drift from the implementation.

## What Changes
- Move `rulebook/tasks/issue-89-editor-tabs-flow/` into `rulebook/tasks/archive/` (post-merge archive).
- Update `openspec/specs/writenow-spec/spec.md` roadmap to mark editor multi-tabs + flow modes as done.
- Add `openspec/_ops/task_runs/ISSUE-100.md` with evidence for the closeout steps.

## Impact
- Affected specs: `openspec/specs/writenow-spec/spec.md`
- Affected code: none (workflow/docs only)
- Breaking change: NO
- User benefit: ensures progress tracking and governance artifacts stay consistent and auditable
