## 1. Implementation
- [x] 1.1 Migrate TipTap widget/factory/open handler from PoC into `writenow-theia/writenow-core/src/browser/` and align imports/module structure.
- [x] 1.2 Register widget factory + open handler in `writenow-core-frontend-module.ts` and ensure `.md` routes to TipTap by default.
- [x] 1.3 Integrate Save/Dirty lifecycle via Theia Saveable (dirty mark on edit, save clears only on success, failure stays dirty with visible error).
- [x] 1.4 Implement focus + shortcut routing per `design/tiptap-integration.md` (reserved shortcuts via Theia; editor semantics via TipTap; IME composition safety).

## 2. Testing
- [x] 2.1 Build + run Browser target; verify `.md` open, typing/Unicode input, Tab indent, Ctrl+B, Ctrl+Z, Ctrl+S save; verify disk content is Markdown.
- [x] 2.2 Build + run Electron target (GUI startup + extension load); validate `writenow-core` frontend contribution loads and app reaches `ready` state.
- [x] 2.3 Add/extend E2E coverage for the `.md` → TipTap → dirty → save → disk path (no stubs; real UI + real filesystem).

## 3. Documentation
- [x] 3.1 Update task card `openspec/specs/sprint-theia-migration/task_cards/p1/006-tiptap-widget.md` (acceptance checkboxes + completion metadata).
- [x] 3.2 Maintain RUN_LOG `openspec/_ops/task_runs/ISSUE-134.md` with commands + key outputs + evidence links.
