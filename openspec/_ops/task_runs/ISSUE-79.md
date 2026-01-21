# ISSUE-79
- Issue: #79
- Branch: task/79-unify-context-assembly
- PR: https://github.com/Leeky1017/WN0.1/pull/82

## Plan
- Audit current prompt assembly (legacy vs ContextAssembler)
- Migrate `ai:skill:run` to ContextAssembler output
- Remove legacy prompt builders and validate via E2E + contract checks

## Runs
### 2026-01-21 14:19 Issue + worktree
- Command: `gh issue create -t "chore(context): unify context assembly pipeline" -b "<body>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/79`
- Command: `git fetch origin && git worktree add -b task/79-unify-context-assembly .worktrees/issue-79-unify-context-assembly origin/main`
- Key output: `Preparing worktree (new branch 'task/79-unify-context-assembly')`

### 2026-01-21 14:45 IPC contract sync
- Command: `node scripts/ipc-contract-sync.js generate`
- Key output: updated `src/types/ipc-generated.ts`
- Command: `npm run contract:check`
- Key output: exit 0

### 2026-01-21 14:52 Unit + lint
- Command: `npm test`
- Key output: `34 passed (34)`
- Command: `npm run lint`
- Key output: `0 errors (warnings only)`

### 2026-01-21 14:54 E2E (preflight)
- Command: `npm run test:e2e`
- Key output: Vite build failed (`cmdk` missing) → install deps

### 2026-01-21 14:55 Install (for E2E)
- Command: `npm ci`
- Key output: `added 1027 packages, and audited 1028 packages`

### 2026-01-21 14:57 E2E
- Command: `npm run test:e2e`
- Key output: `26 passed / 3 skipped`
