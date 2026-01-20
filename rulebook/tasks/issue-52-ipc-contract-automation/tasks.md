## 1. Implementation
- [ ] 1.1 Add main-process contract type source (`electron/ipc/contract/ipc-contract.cjs`)
- [ ] 1.2 Add generator/check script (`scripts/ipc-contract-sync.js`)
- [ ] 1.3 Generate `src/types/ipc-generated.ts` and re-export via `src/types/ipc.ts`
- [ ] 1.4 Keep `electron/preload.cjs` invoke allowlist in sync (markers + generator)
- [ ] 1.5 Wire `contract:generate` / `contract:check` npm scripts

## 2. Testing
- [ ] 2.1 Add Node E2E test that runs `contract:check`
- [ ] 2.2 Run `npm run contract:check`, `npm run lint`, `npm run build`, `npm test`

## 3. Documentation
- [ ] 3.1 Update OpenSpec requirements/design/tasks for contract automation
- [ ] 3.2 Ensure `openspec validate --strict` passes
