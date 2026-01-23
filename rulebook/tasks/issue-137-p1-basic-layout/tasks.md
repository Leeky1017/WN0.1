## 1. Implementation
- [x] 1.1 Branding: set WriteNow product name/title across Browser/Electron and ensure window title is not "Theia".
- [x] 1.2 Branding: add `writenow-theia/resources/` icon assets (PNG 16/32/256 + `.ico`/`.icns`) and wire Electron packaging to them.
- [x] 1.3 Theme: set default theme to dark while keeping theme switching functional.
- [x] 1.4 Layout: trim Activity Bar to creator-focused entries (Explorer / Search / Settings) and ensure removed IDE entries do not appear.
- [x] 1.5 Layout: ensure left Explorer opens by default; add right side panel placeholder widget for AI Panel.
- [x] 1.6 Startup: implement a simple WriteNow Welcome widget as the default main-area content.

## 2. Testing
- [x] 2.1 Add a Phase 1 / Task 007 smoke script (real Theia UI + real filesystem) to verify branding + layout + open `.md` with TipTap.
- [x] 2.2 Verify Browser target manually (`yarn build:browser` + smoke) and capture screenshot evidence.
- [x] 2.3 Verify Electron target manually (`yarn build:electron` + start) and capture screenshot evidence.

## 3. Documentation
- [ ] 3.1 Update task card `openspec/specs/sprint-theia-migration/task_cards/p1/007-basic-layout.md` (acceptance checkboxes + completion metadata).
- [x] 3.2 Maintain RUN_LOG `openspec/_ops/task_runs/ISSUE-137.md` with commands + key outputs + evidence.
- [x] 3.3 Status sync: update `openspec/specs/writenow-spec/spec.md` to mark Task 007 ✅.
