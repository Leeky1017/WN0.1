## 1. Implementation
- [x] 1.1 Scaffold `writenow-theia/` via `generator-theia-extension` (browser-app + electron-app + writenow-core) and align naming (`WriteNow`) + yarn workspaces.
- [x] 1.2 Enable TypeScript strict mode for `writenow-core` and add minimal frontend + backend contributions (verifiable UI + log).
- [x] 1.3 Ensure backend webpack treats `better-sqlite3` + `sqlite-vec` as CommonJS externals for both targets.

## 2. Testing
- [x] 2.1 Linux (WSL2): `yarn --cwd browser-app start` shows Theia shell and core extension signal.
- [x] 2.2 Linux (WSL2): `yarn build:electron && yarn --cwd electron-app start` shows Theia shell and core extension signal.
- [ ] 2.3 Windows (native PowerShell): `yarn install`, `yarn build:electron`, `yarn --cwd electron-app start` succeed.
- [x] 2.4 Windows: verify `better-sqlite3` and `sqlite-vec` install + load (or record blockers + follow-up plan).

## 3. Documentation
- [x] 3.1 Add `writenow-theia/README.md` with local dev instructions (browser/electron start) + native module notes.
- [x] 3.2 Update `openspec/_ops/task_runs/ISSUE-117.md` with all required evidence; check off task card and sync `writenow-spec` progress if this is Phase 1 first completion.
