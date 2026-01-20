## 1. Implementation
- [x] 1.1 TipTap editor core + toolbar (tasks/001)
- [x] 1.2 Dual mode (Markdown SSOT) + editorMode in Zustand (tasks/002)
- [x] 1.3 File ops UI: list/create/open/save/delete + delete feedback (tasks/003, spec)
- [x] 1.4 Autosave + `Ctrl/Cmd+S` + save status state machine (tasks/004)
- [x] 1.5 Snapshots (5 min) + session crash detection + recovery prompt (tasks/004)
- [x] 1.6 IPC contract + typings + preload allowlist updates (api-contract SSOT)

## 2. Testing
- [x] 2.1 Playwright E2E: create→edit→autosave→reopen persists
- [x] 2.2 Playwright E2E: richtext format + mode switch roundtrip (no data loss in scope)
- [x] 2.3 Playwright E2E: delete file updates UI + editor state
- [x] 2.4 Playwright E2E: crash recovery offers restore and restores latest snapshot

## 3. Documentation
- [x] 3.1 Update OpenSpec/API contract docs if new IPC is introduced
