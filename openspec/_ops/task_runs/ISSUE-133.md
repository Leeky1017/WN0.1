# ISSUE-133
- Issue: #133
- Branch: task/133-theia-module-pruning
- PR: <fill-after-created>

## Plan
- Capture baseline deps/sizes for `writenow-theia/` (before pruning) and keep evidence in this RUN_LOG.
- Prune IDE-only modules (terminal / problems / process) from browser + electron targets; reinstall and verify build/start.
- Update task card + writenow-spec status, then open PR with required checks green.

## Goal
- Prune Theia default IDE-only modules from `writenow-theia/` so WriteNow stays lightweight and creator-focused, while keeping core workflows stable.

## Module List
### Pruned (direct deps removed)
- `@theia/terminal` (Terminal UI)
- `@theia/process` (pulls `node-pty`; process/task oriented; removed after confirming Browser/Electron still start)

### Kept transitively (required) but UI entrypoints disabled
- `@theia/markers` is pulled transitively by `@theia/monaco` (editor dependency). We disable the Problems UI entrypoints by rebinding `ProblemContribution` to a no-op implementation in `writenow-core` (so it does not open the view by default, and does not register commands/menus/keybindings/statusbar items).

### Confirmed not included (already absent from the scaffold)
- `@theia/debug`
- `@theia/git`
- `@theia/languages` (and language extensions)
- `@theia/task`
- `@theia/search-in-workspace`
- `@theia/plugin-ext`, `@theia/plugin-ext-vscode`

### Kept (core)
- Browser: `@theia/core`, `@theia/editor`, `@theia/filesystem`, `@theia/navigator`, `@theia/workspace`, `@theia/preferences`, `@theia/messages`, `@theia/monaco`, `writenow-core`
- Electron: (same) + `@theia/electron`

## Status
- CURRENT: Pruning + reinstall done; Browser/Electron start verified. Next: update task card, validate openspec/rulebook, open PR.

## Next Actions
- [x] Capture baseline (before) module lists + size measurements.
- [x] Remove IDE-only deps (`@theia/terminal`, `@theia/process`) and update rebuild scripts; reinstall.
- [x] Disable Problems UI entrypoints (markers are pulled transitively by monaco) via `writenow-core` override.
- [x] Verify `browser-app start` + `electron-app start`.
- [x] Update task card + run openspec/rulebook validation.
- [ ] Create PR, backfill RUN_LOG PR link, and enable auto-merge.

## Decisions Made
- 2026-01-23: Prefer true removal (deps + native rebuild inputs) over “hide UI”, unless Theia startup requires a module transitively.

## Errors Encountered
- 2026-01-23: `@theia/markers` cannot be fully removed because it is pulled transitively by `@theia/monaco` (editor). Resolved by disabling Problems UI entrypoints via a `ProblemContribution` rebind in `writenow-core`.

## Runs
### 2026-01-23 18:07 Issue + worktree
- Command: `gh issue create -t "[SPRINT-THEIA-MIGRATION] Phase 1 / Task 005: Module pruning (remove IDE-only modules)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/133`
- Command: `git worktree add -b "task/133-theia-module-pruning" ".worktrees/issue-133-theia-module-pruning" origin/main`
- Key output: `Preparing worktree (new branch 'task/133-theia-module-pruning')`

### 2026-01-23 18:08 Baseline (before) deps
- Command: `cat writenow-theia/browser-app/package.json && cat writenow-theia/electron-app/package.json`
- Key output:
  - Browser deps include: `@theia/terminal`, `@theia/markers`, `@theia/process`
  - Electron deps include: `@theia/terminal`, `@theia/markers`, `@theia/process`
- Evidence: `writenow-theia/browser-app/package.json`, `writenow-theia/electron-app/package.json`

### 2026-01-23 18:11 Install (WSL2) blocked by native-keymap sysdeps
- Command: `cd writenow-theia && yarn install`
- Key output: `native-keymap: /bin/sh: 1: pkg-config: not found`
- Evidence: install logs (key lines captured in console)

### 2026-01-23 18:13 sysdeps (WSL2 workaround for pkg-config + X11 headers)
- Command: `cd writenow-theia && mkdir -p .sysdeps/debs .sysdeps/root && cd .sysdeps/debs && apt-get download pkgconf pkgconf-bin libpkgconf3 pkg-config libx11-dev libxkbfile-dev libxau-dev libxdmcp-dev libxcb1-dev x11proto-dev xtrans-dev libpthread-stubs0-dev libx11-6 libxkbfile1 libxau6 libxdmcp6 libxcb1 && for deb in *.deb; do dpkg-deb -x "$deb" ../root; done`
- Key output: `.sysdeps/root/usr/bin/pkg-config`
- Evidence: `writenow-theia/.sysdeps/` (gitignored), `writenow-theia/README.md` (workaround documented)

### 2026-01-23 18:14 Install baseline (before pruning)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn install`
- Key output: `✅ No issues were found` (theia check) + `Done in 10.21s.`
- Evidence: `writenow-theia/yarn.lock`

### 2026-01-23 18:14 Size baseline (before pruning)
- Command: `du -sh writenow-theia/node_modules && wc -l writenow-theia/yarn.lock`
- Key output: `665M node_modules`, `9301 lines yarn.lock`
- Evidence: `writenow-theia/node_modules/`, `writenow-theia/yarn.lock`

### 2026-01-23 18:15 Prune IDE-only modules (terminal / process)
- Command: `git diff -- writenow-theia/browser-app/package.json writenow-theia/electron-app/package.json`
- Key output:
  - Removed: `@theia/terminal`, `@theia/process`
  - Updated rebuild modules: removed `node-pty`
- Evidence: `writenow-theia/browser-app/package.json`, `writenow-theia/electron-app/package.json`

### 2026-01-23 18:16 Reinstall after pruning
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn install`
- Key output: `✅ Found 22 dependencies` (theia check) + `✅ No issues were found`
- Evidence: `writenow-theia/yarn.lock`

### 2026-01-23 18:16 Size after pruning
- Command: `du -sh writenow-theia/node_modules && wc -l writenow-theia/yarn.lock`
- Key output: `649M node_modules`, `9219 lines yarn.lock`
- Evidence: `writenow-theia/node_modules/`, `writenow-theia/yarn.lock`

### 2026-01-23 18:17 Build + start (Browser target)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn build:browser`
- Key output: `webpack ... compiled` (OK)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... timeout 25s yarn --cwd browser-app start --hostname 127.0.0.1 --port 3013`
- Key output: `[writenow-core] native smoke completed successfully` + `Theia app listening on http://127.0.0.1:3013.`
- Evidence: `writenow-theia/writenow-core/src/node/writenow-core-backend-contribution.ts`

### 2026-01-23 18:18 Build + start (Electron target)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn build:electron`
- Key output: `webpack ... compiled successfully` (OK)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... timeout 25s yarn --cwd electron-app start`
- Key output: `[writenow-core] native smoke completed successfully` + `[writenow-core] frontend started`
- Evidence: `writenow-theia/writenow-core/src/browser/writenow-core-contribution.ts`

### 2026-01-23 18:20 Disable Problems UI entrypoints (markers → ProblemContribution override)
- Command: `git diff -- writenow-theia/writenow-core/src/browser/writenow-core-frontend-module.ts`
- Key output: `rebind(ProblemContribution) -> no-op implementation` (prevents Problems panel open/commands/menus/keybindings)
- Command: `cd writenow-theia && yarn --cwd writenow-core build && SYSROOT=$PWD/.sysdeps/root ... yarn build:browser && timeout 20s yarn --cwd browser-app start --hostname 127.0.0.1 --port 3014`
- Key output: `Theia app listening on http://127.0.0.1:3014.` (startup OK)
- Evidence: `writenow-theia/writenow-core/src/browser/writenow-core-frontend-module.ts`

### 2026-01-23 18:22 openspec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
- Evidence: `openspec/specs/**`

### 2026-01-23 18:22 rulebook task validate
- Command: `rulebook task validate issue-133-theia-module-pruning`
- Key output: `✅ Task issue-133-theia-module-pruning is valid` (warning: `No spec files found`)
- Evidence: `rulebook/tasks/issue-133-theia-module-pruning/`
