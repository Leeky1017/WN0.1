## 1. Implementation
- [x] 1.1 Extend `editorStore` with multi-tab state (`openTabs`, `activeTabId`, `dirtyMap`, `scrollMap`)
- [x] 1.2 Add `TabToolbar` (tabs + controls in a single row) and integrate into editor layout
- [x] 1.3 Implement tab drag-reorder + overflow strategy + tab context menu (close/close others/close saved)
- [x] 1.4 Implement explicit unsaved-close prompt (save/close without save/cancel)
- [x] 1.5 Add flow modes (typewriter/focus/zen) with preference persistence and state restore

## 2. Testing
- [x] 2.1 Playwright E2E: multi-tab edit → switch → return; unsaved close prompt behavior
- [x] 2.2 Playwright E2E: enable/disable each flow mode; assert UI visibility + relaunch persistence

## 3. Documentation
- [x] 3.1 Update RUN_LOG with evidence (commands + key outputs)
- [x] 3.2 Close out OpenSpec task cards (acceptance checkboxes + completion metadata)
