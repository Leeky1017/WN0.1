# ISSUE-141
- Issue: #141
- Branch: task/141-ipc-migration-doc-sync
- PR: https://github.com/Leeky1017/WN0.1/pull/143

## Goal
- Establish Theia JSON-RPC transport that preserves WriteNow IPC contract semantics (`IpcResponse<T>` + stable error codes) and reuses the existing contract pipeline.

## Plan
- Analyze existing Electron IPC: contract SSOT, generated types, error boundary (`IpcResponse`), and `handleInvoke` injection pattern.
- Implement Theia RPC bridge in `writenow-core` (protocol + backend service + frontend proxy + handleInvoke adapter).
- Migrate and verify >=2 real channels end-to-end (frontend -> backend) with reproducible steps; ensure drift guard remains enforced.

## Status
- CURRENT: Initialized Issue/branch/worktree; starting IPC/RPC design + first end-to-end migrated channels.

## Next Actions
- [ ] Write Rulebook task proposal/tasks + notes; capture IPC analysis + RPC design.
- [ ] Implement `writenow-core` RPC bridge + error boundary (no stack leaks).
- [ ] Add E2E verification for the migrated channels and run CI gates locally.

## Decisions Made
- 2026-01-23: Use Theia JSON-RPC with a single `invoke(channel, payload)` entrypoint to map existing `handleInvoke(channel, handler)` registrations.

## Runs
### 2026-01-23  (prep) GitHub auth + repo remotes
- Command: `gh auth status`
- Key output: `Logged in to github.com account Leeky1017`
- Command: `git remote -v`
- Key output: `origin https://github.com/Leeky1017/WN0.1.git (fetch/push)`

### 2026-01-23  (prep) Issue
- Command: `gh issue create -t "[SPRINT-THEIA-MIGRATION] Phase 2 / Task 008: IPC migration (Electron IPC → Theia RPC)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/141`

### 2026-01-23  (prep) Worktree
- Command: `git fetch origin`
- Key output: `(exit 0)`
- Command: `git worktree add -b task/141-ipc-migration .worktrees/issue-141-ipc-migration origin/main`
- Key output: `Preparing worktree (new branch 'task/141-ipc-migration')`

### 2026-01-23 Contract pipeline update + Theia ipc-generated sync
- Command: `npm run contract:generate`
- Key output: `(exit 0)`
- Evidence:
  - `src/types/ipc-generated.ts`
  - `writenow-theia/writenow-core/src/common/ipc-generated.ts`

### 2026-01-23 Install (repo root)
- Command: `npm ci`
- Key output: `added 1291 packages, and audited 1292 packages`

### 2026-01-23 Validate (repo root)
- Command: `npm run contract:check`
- Key output: `(exit 0)`
- Command: `npm run lint`
- Key output: `0 errors (warnings only)`
- Command: `npm run build`
- Key output: `✓ built in 10.51s`

### 2026-01-23 OpenSpec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`

### 2026-01-23 Theia install/build smoke (writenow-core)
- Command: `cd writenow-theia && yarn install --frozen-lockfile`
- Key output: `FAILED (native-keymap build): pkg-config not found`
- Command: `cd writenow-theia && yarn install --frozen-lockfile --ignore-scripts`
- Key output: `Done in 3.70s (scripts ignored)`
- Command: `cd writenow-theia/writenow-core && yarn build`
- Key output: `Done in 1.83s`
- Command: `cd writenow-theia/writenow-core && yarn rpc:smoke`
- Key output: `[rpc-smoke] ok { ... }`
- Evidence:
  - `writenow-theia/writenow-core/scripts/rpc-smoke.cjs`

### 2026-01-23 PR
- Command: `gh pr create --title "[SPRINT-THEIA-MIGRATION] Phase 2 / Task 008: IPC migration (Theia RPC) (#141)" --body "Closes #141 ..."`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/142`

### 2026-01-23 Post-merge closeout (task card + writenow-spec)
- Command: `gh issue reopen 141`
- Key output: `(reopened)`
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
- Evidence:
  - `openspec/specs/sprint-theia-migration/task_cards/p2/008-ipc-migration.md`
  - `openspec/specs/writenow-spec/spec.md`

### 2026-01-23 PR (closeout)
- Command: `gh pr create --title "[SPRINT-THEIA-MIGRATION] Task 008 closeout: docs sync (#141)" --body "Closes #141 ..."`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/143`
