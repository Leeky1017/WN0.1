# ISSUE-134
- Issue: #134
- Branch: task/134-tiptap-widget
- PR: https://github.com/Leeky1017/WN0.1/pull/136

## Plan
- Formalize TipTap `.md` editor widget in `writenow-theia/writenow-core` (opener + widget + Save/Dirty).
- Verify Browser + Electron targets and capture evidence in this run log.
- Ship via PR checks + auto-merge.

## Goal
- Migrate TipTap PoC into `writenow-theia/writenow-core/` as a production-ready Markdown editor widget for `.md` files, with full Save/Dirty lifecycle and correct keybinding/focus behavior.

## Status
- CURRENT: TipTap `.md` Editor Widget migrated into `writenow-core` and validated via real browser smoke + Electron target start; preparing commits + PR.

## Acceptance (DoD)
- [x] `.md` files open with TipTap widget (not default editor).
- [x] Editing works (typing/deleting/Unicode input, Tab indentation).
- [x] Keybindings: Ctrl+B bold, Ctrl+Z undo, Ctrl+S save.
- [x] Save/Dirty lifecycle correct (dirty mark on edit; cleared after successful save; content written to disk).
- [x] Markdown is SSOT (saved content is Markdown, not HTML).
- [x] Browser + Electron targets verified.
- [x] TypeScript strict build passes; no `any`; observable error handling for load/save failures.

## Next Actions
- [ ] Commit changes with `(#134)` and push branch.
- [ ] Open PR (include `Closes #134`), run required checks, enable auto-merge.
- [ ] After PR is created: backfill PR link in `openspec/_ops/task_runs/ISSUE-134.md` and task card metadata.

## Decisions Made
- 2026-01-23: Use Theia `ReactWidget` + `Saveable` to integrate TipTap editor with Theia tab dirty marker and global Save command.

## Errors Encountered
- 2026-01-23: `scripts/agent_controlplane_sync.sh` missing in repo → switched to manual `git fetch` + `git worktree add` per AGENTS.md worktree requirements.

## Runs
### 2026-01-23 18:06 GitHub auth + remotes
- Command:
  - `gh auth status && git remote -v`
- Key output:
  - `Logged in to github.com account Leeky1017`
  - `origin https://github.com/Leeky1017/WN0.1.git (fetch/push)`

### 2026-01-23 18:07 Create issue
- Command:
  - `gh issue create -t "[SPRINT-THEIA-MIGRATION] Phase 1 / Task 006: TipTap Editor Widget formalization" -b "..."`
- Key output:
  - `https://github.com/Leeky1017/WN0.1/issues/134`

### 2026-01-23 18:07 Create + validate Rulebook task
- Command:
  - `rulebook task create issue-134-tiptap-widget`
  - `rulebook task validate issue-134-tiptap-widget`
- Key output:
  - `valid: true` (warnings: no spec files yet)
- Evidence:
  - `rulebook/tasks/issue-134-tiptap-widget/`

### 2026-01-23 18:08 Worktree setup
- Command:
  - `git fetch origin`
  - `git worktree add -b task/134-tiptap-widget .worktrees/issue-134-tiptap-widget origin/main`
- Key output:
  - `Preparing worktree (new branch 'task/134-tiptap-widget')`
  - `HEAD is now at 783676c Fix Windows smoke workflow markers (#131) (#132)`

### 2026-01-23 18:10 Rulebook task created in worktree + spec validated
- Command:
  - `rulebook task create issue-134-tiptap-widget`
  - `rulebook task validate issue-134-tiptap-widget`
- Key output:
  - `✅ Task issue-134-tiptap-widget created successfully`
  - `✅ Task issue-134-tiptap-widget is valid`
- Evidence:
  - `rulebook/tasks/issue-134-tiptap-widget/`

### 2026-01-23 18:23 Install deps (FAILED: native-keymap build prerequisites)
- Command:
  - `cd writenow-theia && yarn install`
- Key output:
  - `error ... node-gyp rebuild (native-keymap)`
  - `/bin/sh: 1: pkg-config: not found`

### 2026-01-23 18:31 Install deps (OK) with local pkg-config shim for native-keymap
- Command:
  - `apt-get download libx11-dev libxkbfile-dev x11proto-dev pkgconf-bin libpkgconf3` (extract headers/libs under `/tmp/x11-dev-pkgs/`)
  - `PKG_CONFIG=/tmp/wn-pkg-config yarn install`
- Key output:
  - `✅ No issues were found` (theia check:theia-version)
  - `writenow-core: $ tsc` → `Done`
- Evidence:
  - `writenow-theia/yarn.lock`
  - `/tmp/wn-pkg-config`

### 2026-01-23 19:48 Browser smoke: TipTap `.md` open + edit + keybindings + save/dirty (PASS)
- Command:
  - `PKG_CONFIG=/tmp/wn-pkg-config node writenow-theia/scripts/p1-006-tiptap-md-smoke.cjs`
- Key output:
  - `[p1-006] tab (test.md) after edit: ... theia-mod-dirty ...`
  - `[p1-006] tab (test.md) after save: ...`
  - `[p1-006] PASS`
  - Artifacts: `/tmp/writenow-theia-smoke-artifacts-c5UXJi` (screenshots + `final.md`)
- Evidence:
  - `writenow-theia/scripts/p1-006-tiptap-md-smoke.cjs`

### 2026-01-23 19:55 Build (tsc strict): writenow-core
- Command:
  - `yarn --cwd writenow-theia/writenow-core build`
- Key output:
  - `Done in 1.45s.`
- Evidence:
  - `writenow-theia/writenow-core/src/browser/tiptap-markdown-editor-widget.tsx`

### 2026-01-23 19:56 Electron native rebuild (Theia)
- Command:
  - `PKG_CONFIG=/tmp/wn-pkg-config yarn --cwd writenow-theia/electron-app rebuild`
- Key output:
  - `Processed "node-pty"`
  - `Processed "native-keymap"`
  - `Processed "better-sqlite3"`
  - `✔ Rebuild Complete`
- Evidence:
  - `writenow-theia/electron-app/package.json` (rebuild script)

### 2026-01-23 19:57 Electron target start (Electron Node runtime, no UI)
- Command:
  - `cd writenow-theia && env ELECTRON_RUN_AS_NODE=1 timeout 20s ./node_modules/.bin/electron electron-app/lib/backend/main.js --hostname 127.0.0.1 --port 3021 <temp-workspace>`
- Key output:
  - `Theia app listening on http://127.0.0.1:3021.`
  - `[writenow-core] native smoke completed successfully`
- Evidence:
  - `writenow-theia/electron-app/lib/backend/main.js`

### 2026-01-23 20:02 Browser smoke (updated): Ctrl+K routing + Esc palette close (PASS)
- Command:
  - `PKG_CONFIG=/tmp/wn-pkg-config node writenow-theia/scripts/p1-006-tiptap-md-smoke.cjs`
- Key output:
  - `[p1-006] PASS`
  - Artifacts: `/tmp/writenow-theia-smoke-artifacts-uKJDdJ` (screenshots + `final.md`)
- Evidence:
  - `writenow-theia/scripts/p1-006-tiptap-md-smoke.cjs`

### 2026-01-23 20:21 Electron target start (GUI) with `--disable-gpu` (PASS)
- Command:
  - `PKG_CONFIG=/tmp/wn-pkg-config timeout -s INT 20s yarn --cwd writenow-theia/electron-app start --disable-gpu --no-sandbox --hostname 127.0.0.1 --port 3032 <temp-workspace>`
- Key output:
  - `Theia app listening on http://127.0.0.1:3032.`
  - `[writenow-core] frontend started`
  - `Changed application state ... to 'ready'.`
  - `electron exited with signal SIGINT` (timeout stop)
- Evidence:
  - `writenow-theia/electron-app/package.json` (start script)

### 2026-01-23 20:30 openspec-log-guard failure diagnosis
- Command: `gh run view 21286217657 --log-failed`
- Key output:
  - `Run log openspec/_ops/task_runs/ISSUE-134.md is incomplete. Missing: section '## Plan', at least one '- Command: \`...\`'`
- Evidence:
  - `openspec/_ops/task_runs/ISSUE-134.md`
