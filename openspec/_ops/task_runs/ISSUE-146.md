# ISSUE-146
- Issue: #146
- Branch: task/146-theia-sqlite-migration
- PR: https://github.com/Leeky1017/WN0.1/pull/147

## Goal
- Migrate WriteNow SQLite initialization + schema management into the Theia backend, and migrate baseline CRUD (projects/files/version) to run against the backend DB via Theia RPC.

## Plan
- Port `electron/database/init.cjs` + `electron/database/schema.sql` into `writenow-theia/writenow-core/src/node/database/` with schema versioning + WAL/foreign_keys + FTS migrations.
- Replace the Theia backend file-based stubs with DB-backed services for projects/files/version, exposed via the existing Theia RPC boundary (no stack leaks, stable `IpcResponse` errors).
- Add reproducible verification steps/scripts and record evidence (DB init, CRUD, version history); then update task card + writenow-spec status.

## Status
- CURRENT: SQLite data layer + projects/files/version services implemented; local verifications (Theia rpc-smoke + repo gates) completed; preparing PR.

## Next Actions
- [ ] Create PR + enable auto-merge; ensure required checks (`ci`, `openspec-log-guard`, `merge-serial`) are green.
- [ ] After merge: closeout docs (task card 009 + writenow-spec status sync) with PR link + RUN_LOG.

## Decisions Made
- 2026-01-24: Choose Option A (global DB under userData/data/writenow.db) as the initial Theia backend DB strategy to minimize migration surface; revisit per-project DB once workspace/project boundaries are fully wired.

## Errors Encountered
- 2026-01-24: `writenow-core` rpc-smoke failed because `better-sqlite3` was installed with `yarn --ignore-scripts` (native bindings missing) → fixed by running `npm run build-release` in `writenow-theia/node_modules/better-sqlite3`.

## Runs
### 2026-01-24 (prep) Issue
- Command:
  - `gh issue create -t "[SPRINT-THEIA-MIGRATION] Phase 2 / Task 009: SQLite migration (init + schema + CRUD)" ...`
- Key output:
  - `https://github.com/Leeky1017/WN0.1/issues/146`

### 2026-01-24 (prep) Worktree
- Command:
  - `git fetch origin`
  - `git worktree add -b task/146-theia-sqlite-migration .worktrees/issue-146-theia-sqlite-migration origin/main`
- Key output:
  - `Preparing worktree (new branch 'task/146-theia-sqlite-migration')`

### 2026-01-24 Install (writenow-theia)
- Command:
  - `cd writenow-theia && corepack enable && corepack prepare yarn@1.22.22 --activate`
  - `cd writenow-theia && yarn install --frozen-lockfile --ignore-scripts`
- Key output:
  - `Done in 6.63s. (scripts ignored)`

### 2026-01-24 Build native dep: better-sqlite3 (host Node ABI)
- Command:
  - `cd writenow-theia/node_modules/better-sqlite3 && npm run build-release`
- Key output:
  - `gyp info ok`

### 2026-01-24 Build + RPC verification (writenow-core)
- Command:
  - `cd writenow-theia/writenow-core && yarn build`
  - `cd writenow-theia/writenow-core && yarn rpc:smoke`
- Key output:
  - `[rpc-smoke] ok { dataDir: "/tmp/writenow-theia-rpc-smoke-.../", dbPath: ".../data/writenow.db", ... }`
- Evidence:
  - `writenow-theia/writenow-core/scripts/rpc-smoke.cjs`

### 2026-01-24 Repo gates (root)
- Command:
  - `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
  - `npm ci`
  - `npm run contract:check`
  - `npm run lint`
  - `npm run build`
- Key output:
  - `Totals: 14 passed, 0 failed (14 items)`
  - `added 1291 packages, and audited 1292 packages`
  - `✓ built in 11.29s`
