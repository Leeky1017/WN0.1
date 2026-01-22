# Proposal: issue-89-editor-tabs-flow

## Why
Deliver a professional writing IDE experience: true multi-document tabs (state-safe switching, ordering, overflow, and explicit unsaved close UX) plus flow-protection modes (typewriter, paragraph focus, zen) so writers can stay immersed without losing work.

## What Changes
- Add a single-line `TabToolbar` that merges tabs + editor controls.
- Extend `editorStore` to support `openTabs`/`activeTabId` plus per-tab dirty + scroll preservation.
- Add flow modes (Typewriter / Paragraph Focus / Zen) with persisted user preferences.
- Add Playwright E2E coverage for multi-tabs and flow modes (including relaunch persistence).

## Impact
- Affected specs:
  - `openspec/specs/wn-frontend-deep-remediation/spec.md` (FROTNEND-EDITOR-001, FROTNEND-FLOW-001)
  - `openspec/specs/wn-frontend-deep-remediation/task_cards/p2/FRONTEND-P2-002-editor-tabbar-toolbar-multitab.md`
  - `openspec/specs/wn-frontend-deep-remediation/task_cards/p2/FRONTEND-P2-003-flow-protection-modes.md`
- Affected code: `src/components/Editor/*`, `src/stores/*`, `src/App.tsx`, `tests/e2e/*`
- Breaking change: NO (UI/UX upgrade with state migration handled in store)
- User benefit: Users can work across multiple documents safely and write in a low-distraction flow mode with preferences restored across restarts.
