# Proposal: issue-314-e2e-write-mode-ci

## Why
Write Mode E2E cases are implemented and tagged (`@write-mode`), but there is no dedicated CI workflow to run them and persist diagnostic artifacts (trace/screenshot/main.log). This leaves the “E2E-first” quality gate unenforced and makes failures costly to debug.

## What Changes
- Add a dedicated GitHub Actions workflow `e2e-write-mode` that builds backend + Electron and runs Playwright tests matching `@write-mode` under `xvfb`.
- Upload Playwright artifacts and best-effort Electron `main.log` on failure.
- Close out the P2-001 task card remaining acceptance items.

## Impact
- Affected specs: `openspec/specs/sprint-write-mode-ide/task_cards/p2/P2-001-e2e-write-mode.md`, `openspec/specs/writenow-spec/spec.md`
- Affected code: `.github/workflows/e2e-write-mode.yml`
- Breaking change: NO
- User benefit: Write Mode regressions get caught early with actionable artifacts.
