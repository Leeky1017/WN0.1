# ISSUE-21
- Issue: #21
- Branch: task/21-phase-0-5-infra
- PR: <fill-after-created>

## Plan
- Implement Phase 0.5 infra per `CODEX_TASK_P05.md`
- Add tests (Vitest + Playwright) and keep TypeScript strict
- Wire preload/main with allowlisted IPC + unified Envelope

## Runs

### 2026-01-20 10:32 deps install (clean)
- Command: `npm ci --no-audit --no-fund`
- Key output: `added 840 packages in 28s`
- Evidence: `package-lock.json`

### 2026-01-20 10:38 lint
- Command: `npm run lint`
- Key output: `✖ 5 problems (0 errors, 5 warnings)`
- Evidence: `eslint.config.js`

### 2026-01-20 10:38 unit tests
- Command: `npm run test`
- Key output: `Test Files  3 passed (3)`, `Tests  9 passed (9)`
- Evidence: `vitest.config.ts`

### 2026-01-20 10:39 build
- Command: `npm run build`
- Key output: `✓ built in 1.23s`
- Evidence: `vite.config.ts`

### 2026-01-20 10:49 e2e (Electron + Playwright)
- Command: `npm run test:e2e`
- Key output: `✓  1 tests/e2e/app-launch.spec.ts:9:1 › app launch, create file, and initialize storage`, `1 passed (4.1s)`
- Evidence: `tests/e2e/app-launch.spec.ts`
