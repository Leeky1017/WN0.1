# Spec delta: issue-28-sprint-1-editor

## Goal
- Implement Sprint 1 editor scope as defined in `openspec/specs/sprint-1-editor/spec.md` and task cards `openspec/specs/sprint-1-editor/tasks/001-005-*.md`.

## Decisions (Sprint 1 scope)
- Dual mode SSOT: persist and store **Markdown string** as the single source of truth; richtext derives via TipTap + Markdown conversion.

## Contract changes
- If crash recovery/snapshot requires new IPC, update `openspec/specs/api-contract/spec.md` + `src/types/ipc.ts` + `electron/preload.cjs` together (SSOT).

## Acceptance scenarios to verify (E2E)
- TipTap editor supports headings/bold/italic/lists + undo/redo.
- Markdown ↔ richtext switching keeps content consistent (within supported nodes).
- Real file CRUD via IPC persists across relaunch.
- Autosave (2s debounce) + manual save (`Ctrl/Cmd+S`) updates observable save state.
- Crash recovery: periodic snapshots + unclean exit detection + restore flow.

