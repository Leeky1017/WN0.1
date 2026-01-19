# WriteNow OpenSpec Handoff Manual

This file is the authoritative guide for maintaining WriteNow as a **spec-first** project.

## Canonical rule

- All canonical project constraints live in `openspec/specs/` (especially `writenow-constitution`).
- `docs/` is non-canonical and should be treated as pointers/entrypoints (avoid a second source of truth).

## Directory layout (OpenSpec official)

OpenSpec official CLI (`@fission-ai/openspec`) expects:

```text
openspec/
  project.md
  specs/<spec-id>/spec.md
  changes/<change-id>/{proposal.md,tasks.md,design.md?,specs/...}
  changes/archive/YYYY-MM-DD-<change-id>/
  _ops/
```

## WriteNow delivery workflow (Issue + Rulebook + GitHub)

WriteNow uses `$openspec-rulebook-github-delivery` as the delivery hard gate:

- Every change MUST be tracked by a GitHub Issue `#N`.
- Branch MUST be `task/<N>-<slug>`.
- All commits MUST include `(#N)`.
- PR body MUST include `Closes #N`.
- PR MUST include `openspec/_ops/task_runs/ISSUE-N.md`.
- Required checks MUST be green: `ci` / `openspec-log-guard` / `merge-serial`.
- Auto-merge MUST be enabled.

Rulebook tasks are the execution checklist:
- `rulebook/tasks/issue-<N>-<slug>/proposal.md`
- `rulebook/tasks/issue-<N>-<slug>/tasks.md`

Worktree hygiene (mandatory after merge):
- After the PR is merged and controlplane `main` is synced, run:
  - `scripts/agent_worktree_cleanup.sh <N> <slug>`

## Spec writing (strict)

All active specs MUST pass:

```bash
openspec validate --specs --strict --no-interactive
```

Spec format baseline (required):

- `## Purpose`
- `## Requirements`
  - `### Requirement: ...`
    - `#### Scenario: ...`
      - `- **WHEN** ...`
      - `- **THEN** ...`

## Changes folder policy

`openspec/changes/` is reserved for cross-issue initiatives that need a dedicated change proposal.
If used, changes MUST also be mapped to a GitHub Issue and follow the same PR hard gates.
