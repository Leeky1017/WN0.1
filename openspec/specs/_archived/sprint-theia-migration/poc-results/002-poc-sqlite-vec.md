# 002-poc-sqlite-vec

## Verdict
- Status: PASS (with packaging follow-ups)
- Date: 2026-01-22

## Environment
- OS: Ubuntu 24.04.3 LTS (WSL2)
- Node: v20.19.6
- Yarn: 1.22.22
- Theia: 1.67.0 (`generator-theia-extension`)

## What we built (PoC scope)
- A backend startup contribution that:
  - loads `better-sqlite3`
  - runs minimal CRUD (create table → insert → select)
  - loads `sqlite-vec` (`sqliteVec.load(db)`)
  - creates a `vec0` virtual table
  - inserts a vector and runs a distance query
  - logs each stage with actionable errors (no silent failure)
  - Code: `theia-poc/writenow-theia-poc/src/node/sqlite-vec-poc-backend-contribution.ts`

## Verification steps
### 1) Browser target (dev backend)
- `cd theia-poc`
- `timeout 25s yarn --cwd browser-app start --hostname 127.0.0.1 --port 3012 poc-workspace`
- Expected logs include:
  - `[sqlite-vec-poc] CRUD ok ...`
  - `[sqlite-vec-poc] vec query ok ...`
  - `[sqlite-vec-poc] completed successfully`

### 2) Electron target (Node runtime inside Electron, no UI required)
1) Build Electron target (rebuild native modules):
   - `cd theia-poc`
   - If your OS already has `pkg-config` + X11 headers: `yarn build:electron`
   - In restricted envs (no system deps), we used a local sysroot workaround (see “Findings”).
2) Run Theia backend entry using Electron’s Node runtime:
   - `cd theia-poc`
   - `env ELECTRON_RUN_AS_NODE=1 timeout 20s ./node_modules/.bin/electron electron-app/lib/backend/main.js --hostname 127.0.0.1 --port 3020 poc-workspace`
3) Expected logs include:
   - `[sqlite-vec-poc] completed successfully`

## Findings
### 1) Webpack must not bundle native modules (required)
- Bundling `better-sqlite3`/`sqlite-vec` into the backend webpack output breaks native addon resolution (e.g. `bindings` cannot find `better_sqlite3.node`).
- Fix: mark them as CommonJS externals for backend builds:
  - `theia-poc/browser-app/webpack.config.js`
  - `theia-poc/electron-app/webpack.config.js`

### 2) Electron target needs Electron-ABI native rebuild (required)
- The Electron runtime uses a different Node ABI than the host Node process; if `better-sqlite3` is only built for host Node, Electron will fail with `NODE_MODULE_VERSION` mismatch.
- Fix: ensure `theia rebuild:electron` includes `better-sqlite3` (generator script already does), and rerun `yarn --cwd electron-app rebuild` if caches drift.
- Note: Theia rebuild may swap native addons between browser/electron targets; when switching targets, run the matching rebuild:
  - browser: `yarn --cwd browser-app rebuild`
  - electron: `yarn --cwd electron-app rebuild`

### 3) System dependencies for native-keymap rebuild (environment-specific)
- On this machine we did not have system `pkg-config` / X11 dev headers available via `apt-get install` (no sudo).
- Workaround used for this PoC:
  - download `.deb` packages and extract into `theia-poc/.sysdeps/root` (gitignored)
  - run `yarn install` / `yarn build:electron` with `PATH/LD_LIBRARY_PATH/PKG_CONFIG_*` pointing to that sysroot
- This is a CI/packaging concern, not a fundamental incompatibility.

## Workarounds / Proposed solution
### For PoC / dev
- Keep the backend PoC as a startup contribution so failures surface immediately with stage-tagged logs.
- Keep `better-sqlite3` and `sqlite-vec` as webpack externals for backend builds.
- For Electron target issues, rerun:
  - `yarn --cwd electron-app rebuild`

### For Phase 1+ (packaging hardening)
- Decide on a cross-platform native strategy:
  - ensure required system deps exist in CI/build images (preferred), or
  - vendor a sysroot/toolchain in CI, and document it explicitly.
- Add a dedicated smoke script (similar to PoC 001) that asserts `[sqlite-vec-poc] completed successfully` on both browser and electron targets.

## Risks / Follow-ups
### Packaging / distribution
- Full “installer packaging” was not validated in Phase 0; we validated the Electron target backend runtime + native ABI rebuild, which is the highest-risk technical piece for `better-sqlite3`/`sqlite-vec`.
- Cross-platform binaries (Windows/macOS) still need dedicated verification in Phase 1 before committing to a full migration plan.
