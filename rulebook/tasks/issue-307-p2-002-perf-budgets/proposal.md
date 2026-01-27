# Proposal: issue-307-p2-002-perf-budgets

## Why
Perf budgets must be measurable and enforced in CI to prevent Write Mode regressions (input latency, file open, autosave) from silently shipping.

## What Changes
- Add E2E-only perf bridge + perf marks for editor ready, file open, autosave, input latency, and AI cancel.
- Add Playwright perf E2E tests with CI-stable guardrails.
- Wire a dedicated CI workflow to run the perf gate.
- Surface large-document performance mode in UI to explain expected degradation.

## Impact
- Affected specs: openspec/specs/sprint-write-mode-ide/design/02-editor-performance.md, openspec/specs/sprint-write-mode-ide/spec.md, openspec/specs/sprint-write-mode-ide/task_cards/p2/P2-002-perf-budgets.md
- Affected code: writenow-frontend/src/**, writenow-frontend/tests/e2e/perf/**, .github/workflows/e2e-perf.yml
- Breaking change: NO
- User benefit: measurable perf budgets, automated regression blocking, clear large-doc UX cues
