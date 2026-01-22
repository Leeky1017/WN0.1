## 1. Implementation
- [x] 1.1 Scaffold Theia PoC app via `generator-theia-extension` (browser + electron) in `theia-poc/`
- [x] 1.2 PoC 001: Implement TipTap-based `.md` Editor Widget + opener registration + focus/shortcut routing
- [x] 1.3 PoC 002: Implement backend PoC to load `better-sqlite3` + `sqlite-vec` and run minimal CRUD + vec0 query (dev + electron target)
- [x] 1.4 PoC fixtures: add a minimal workspace with a sample `.md` file for reproducible runs

## 2. Testing
- [x] 2.1 Build + run browser app; verify `.md` opens in TipTap and shortcuts behave (document evidence/logs)
- [x] 2.2 Build + run electron app; verify backend sqlite-vec PoC runs (document evidence/logs)

## 3. Documentation
- [x] 3.1 Write PoC result docs: `openspec/specs/sprint-theia-migration/poc-results/001|002|003-*.md`
- [ ] 3.2 Update P0 task cards acceptance + completion metadata (Issue/PR/RUN_LOG)

## Evidence
- PoC 001 smoke: `node theia-poc/scripts/poc001-browser-smoke.cjs` → `[poc001] PASS`
- PoC 001 result doc: `openspec/specs/sprint-theia-migration/poc-results/001-poc-tiptap-theia.md`
- PoC 002 result doc: `openspec/specs/sprint-theia-migration/poc-results/002-poc-sqlite-vec.md`
- PoC 003 decision doc: `openspec/specs/sprint-theia-migration/poc-results/003-poc-storage-model.md`
