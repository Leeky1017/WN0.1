# Proposal: issue-119-theia-windows-build

## Why
`writenow-theia/` scaffold is merged (Issue #117 / PR #118), but **native Windows** setup is still not reproducible:

- `yarn install` fails due to `drivelist` native build fallback (`llvm-lib.exe` errors in the reported environment).
- This blocks `yarn build:electron` and prevents validating the Electron target on Windows.

Phase 1 needs a scaffold that is **cross-platform buildable**, otherwise later widget/backend migration work cannot be validated on Windows.

## What Changes
- Add Windows-focused install/build guidance and guardrails so native builds select a supported toolchain (MSVC) and avoid known failure modes.
- Add an automated Windows smoke path (non-required, opt-in) to reproduce and validate `writenow-theia` install/build/start in a clean Windows environment.
- Archive the Rulebook task for Issue #117 per repo governance.

## Impact
- Affected specs:
  - `openspec/_ops/task_runs/ISSUE-119.md`
  - (optional) `openspec/specs/sprint-theia-migration/task_cards/p1/004-theia-scaffold.md` (note-only)
- Affected code:
  - `writenow-theia/README.md`
  - (optional) `.github/workflows/theia-windows-smoke.yml`
  - Rulebook task archive move under `rulebook/tasks/archive/`
- Breaking change: NO (docs + workflow + governance housekeeping)
- User benefit: Windows developers can install/build/run the Theia scaffold with deterministic prerequisites and observable failure modes.
