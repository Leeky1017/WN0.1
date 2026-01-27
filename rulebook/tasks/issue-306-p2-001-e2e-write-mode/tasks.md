## 1. Implementation
- [x] 1.1 Create write-mode E2E suite directory and tag specs with `@write-mode`
- [x] 1.2 Cover WM-001..WM-005 with real UI + disk persistence assertions
- [x] 1.3 Keep tests on existing helpers (`writenow-frontend/tests/e2e/_utils`) and stable selectors

## 2. Testing
- [ ] 2.1 Run `npm run test:e2e -- -g "@write-mode"` in `writenow-frontend` (WSL guard skips; override hit teardown timeouts — see RUN_LOG)
- [x] 2.2 Capture failure traces for the WSL override run

## 3. Documentation
- [x] 3.1 Update task card metadata + acceptance checkboxes
- [x] 3.2 Append RUN_LOG with commands + key outputs
