# ISSUE-111
- Issue: #111
- Branch: task/111-theia-p0-poc
- PR: https://github.com/Leeky1017/WN0.1/pull/112

## Plan
- Inspect theia-poc frontend structure and existing Theia editor wiring
- Implement a ReactWidget TipTap editor and register .md opener
- Validate keybindings routing and document run steps/gotchas

## Status
- CURRENT: PoC 001/002/003 outputs已落盘（`poc-results/`）；已完成 browser + electron target 验证（见最新 Runs）；等待创建 PR 并补齐链接回填。

## Next Actions
- [x] Run `rulebook task validate issue-111-theia-p0-poc` + `npx openspec validate --specs --strict --no-interactive` 并记录证据
- [x] Commit + push + create PR（Closes #111）并开启 auto-merge
- [x] 回填 P0 task cards 的 `PR:` 链接

## Decisions Made
- 2026-01-22: Run PoC via BackendApplicationContribution `initialize`/`onStart` to surface native module failures early at backend startup.

## Errors Encountered
- 2026-01-22: `yarn build:electron` failed because `pkg-config` was missing for `native-keymap` rebuild → rerun with `.sysdeps` PATH/PKG_CONFIG_*/LD_LIBRARY_PATH.
- 2026-01-22: `yarn install` failed due to missing TipTap deps + TS errors in `src/browser/*` → electron build cannot finish until frontend deps are resolved.
- 2026-01-22: Electron target runtime hit `NODE_MODULE_VERSION` mismatch for `better-sqlite3` → rerun `yarn --cwd electron-app rebuild` (theia rebuild) to rebuild native addon for Electron ABI.

## Runs
### 2026-01-22 18:36 scaffold (generator-theia-extension)
- Command: `mkdir -p theia-poc && cd theia-poc && yo theia-extension writenow-theia-poc --extensionType backend --author "WriteNow" --description "WriteNow Theia migration PoC (Phase 0)" --skip-cache`
- Key output: `create browser-app/...` + `create electron-app/...` + `Installing dependencies`
- Evidence: `theia-poc/README.md`, `theia-poc/browser-app/package.json`, `theia-poc/electron-app/package.json`, `theia-poc/writenow-theia-poc/`

### 2026-01-22 18:39 deps blocker (native-keymap requires pkg-config + X11 headers)
- Command: `cd theia-poc && yarn install`
- Key output: `node_modules/native-keymap: Command failed: node-gyp rebuild` + `/bin/sh: 1: pkg-config: not found`
- Evidence: `theia-poc/node_modules/native-keymap/build/config.gypi` (generation attempt)

### 2026-01-22 18:44 deps workaround (local sysroot via apt-get download + dpkg-deb extract)
- Command: `apt-get download pkg-config pkgconf pkgconf-bin libpkgconf3 libx11-dev libxkbfile-dev ...` + `dpkg-deb -x *.deb theia-poc/.sysdeps/root` + `PATH/LD_LIBRARY_PATH/PKG_CONFIG_* yarn install`
- Key output: `yarn install ... Done in 42.01s.`
- Evidence: `theia-poc/.sysdeps/` (gitignored), `theia-poc/yarn.lock`

### 2026-01-22 19:12 add sqlite deps (fails on TS)
- Command: `cd theia-poc && yarn workspace writenow-theia-poc add better-sqlite3 sqlite-vec`
- Key output: `tsc` failed with `Module '"fs"' has no default export` + `Module '"os"' has no default export` + `Could not find a declaration file for module 'better-sqlite3'`
- Evidence: `theia-poc/writenow-theia-poc/package.json`, `theia-poc/yarn.lock`

### 2026-01-22 19:12 add better-sqlite3 types (fails on namespace type)
- Command: `cd theia-poc && yarn workspace writenow-theia-poc add -D @types/better-sqlite3`
- Key output: `Cannot use namespace 'Database' as a type` (tsc)
- Evidence: `theia-poc/writenow-theia-poc/src/node/sqlite-vec-poc-backend-contribution.ts`

### 2026-01-22 19:12 build backend package
- Command: `cd theia-poc && yarn workspace writenow-theia-poc run build`
- Key output: `tsc` success
- Evidence: `theia-poc/writenow-theia-poc/lib/node/`

### 2026-01-22 19:12 build electron (fails: pkg-config missing)
- Command: `cd theia-poc && yarn build:electron`
- Key output: `/bin/sh: 1: pkg-config: not found` + `node-gyp failed to rebuild '.../native-keymap'`
- Evidence: `theia-poc/node_modules/native-keymap/`, command output

### 2026-01-22 19:12 start electron (fails: build missing)
- Command: `cd theia-poc && timeout 120s yarn start:electron`
- Key output: `Unable to find Electron app .../electron-app` + `Cannot find module .../electron-app/lib/backend/electron-main.js`
- Evidence: command output

### 2026-01-22 19:12 build electron with sysdeps (fails: install required)
- Command: `cd theia-poc && SYSROOT=$PWD/.sysdeps/root PATH=\"$SYSROOT/usr/bin:$PATH\" PKG_CONFIG_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig\" PKG_CONFIG_SYSROOT_DIR=\"$SYSROOT\" LD_LIBRARY_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\" yarn build:electron`
- Key output: `✔ Rebuild Complete` + `Updated dependencies, please run "install" again` (exit 1)
- Evidence: command output

### 2026-01-22 19:12 install with sysdeps (fails: TipTap TS errors)
- Command: `cd theia-poc && SYSROOT=$PWD/.sysdeps/root PATH=\"$SYSROOT/usr/bin:$PATH\" PKG_CONFIG_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig\" PKG_CONFIG_SYSROOT_DIR=\"$SYSROOT\" LD_LIBRARY_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\" yarn install`
- Key output: `Cannot find module '@tiptap/core'` + `Cannot find module '@tiptap/react'` + `Cannot find module '@tiptap/starter-kit'` + `Cannot find module '@tiptap/markdown'` + `Binding element 'nextEditor' implicitly has an 'any' type`
- Evidence: `theia-poc/writenow-theia-poc/src/browser/tiptap-markdown-editor-widget.tsx`, command output

### 2026-01-22 21:48 PoC 001 smoke (browser + real UI)
- Command: `node theia-poc/scripts/poc001-browser-smoke.cjs`
- Key output: `[poc001] PASS`
- Evidence: `theia-poc/scripts/poc001-browser-smoke.cjs`, `theia-poc/writenow-theia-poc/src/browser/tiptap-markdown-editor-widget.tsx`

### 2026-01-22 21:48 PoC 002 smoke (browser backend)
- Command: `cd theia-poc && timeout 25s yarn --cwd browser-app start --hostname 127.0.0.1 --port 3012 poc-workspace`
- Key output: `[sqlite-vec-poc] completed successfully`
- Evidence: `theia-poc/writenow-theia-poc/src/node/sqlite-vec-poc-backend-contribution.ts`

### 2026-01-22 21:49 PoC 002 electron rebuild (native modules)
- Command: `cd theia-poc && SYSROOT=$PWD/.sysdeps/root PATH=\"$SYSROOT/usr/bin:$PATH\" PKG_CONFIG_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig\" PKG_CONFIG_SYSROOT_DIR=\"$SYSROOT\" LD_LIBRARY_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\" yarn --cwd electron-app rebuild`
- Key output: `Processed \"better-sqlite3\"` + `✔ Rebuild Complete`
- Evidence: `theia-poc/electron-app/package.json` (`theia rebuild:electron ... better-sqlite3`)

### 2026-01-22 21:50 PoC 002 smoke (electron target backend runtime)
- Command: `cd theia-poc && env ELECTRON_RUN_AS_NODE=1 timeout 20s ./node_modules/.bin/electron electron-app/lib/backend/main.js --hostname 127.0.0.1 --port 3020 poc-workspace`
- Key output: `[sqlite-vec-poc] completed successfully`
- Evidence: `theia-poc/electron-app/lib/backend/main.js`, `theia-poc/writenow-theia-poc/src/node/sqlite-vec-poc-backend-contribution.ts`

### 2026-01-22 21:52 build electron app (end-to-end bundle)
- Command: `cd theia-poc && SYSROOT=$PWD/.sysdeps/root PATH=\"$SYSROOT/usr/bin:$PATH\" PKG_CONFIG_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig\" PKG_CONFIG_SYSROOT_DIR=\"$SYSROOT\" LD_LIBRARY_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\" yarn build:electron`
- Key output: `native node modules are already rebuilt for electron` + `compiled successfully`
- Evidence: `theia-poc/electron-app/lib/`

### 2026-01-22 22:10 target swap note (restore browser native addons after electron rebuild)
- Command: `cd theia-poc && SYSROOT=$PWD/.sysdeps/root PATH=\"$SYSROOT/usr/bin:$PATH\" PKG_CONFIG_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig\" PKG_CONFIG_SYSROOT_DIR=\"$SYSROOT\" LD_LIBRARY_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\" yarn --cwd browser-app rebuild`
- Key output: `Reverted \"better-sqlite3\"` (restores host Node ABI for browser backend)
- Evidence: `theia-poc/browser-app/package.json` (rebuild script), PoC notes in `openspec/specs/sprint-theia-migration/poc-results/002-poc-sqlite-vec.md`

### 2026-01-22 22:15 rulebook task validate
- Command: `rulebook task validate issue-111-theia-p0-poc`
- Key output: `✅ Task issue-111-theia-p0-poc is valid` (warning: `No spec files found`)
- Evidence: `rulebook/tasks/issue-111-theia-p0-poc/`

### 2026-01-22 22:16 openspec validate (strict)
- Command: `npx openspec validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
- Evidence: `openspec/specs/sprint-theia-migration/spec.md`, `openspec/specs/sprint-theia-migration/poc-results/*.md`

### 2026-01-22 22:25 create PR
- Command: `gh pr create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/112`
- Evidence: PR + `openspec/_ops/task_runs/ISSUE-111.md` header updated
