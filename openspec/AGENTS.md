# WriteNow OpenSpec Handoff Manual

This file is the authoritative guide for maintaining WriteNow as a **spec-first** project.

## Canonical rule

- All canonical product/architecture/roadmap constraints live in `openspec/specs/` (especially `writenow-spec`).
- Governance & delivery constraints live in repo-root `AGENTS.md`.
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
