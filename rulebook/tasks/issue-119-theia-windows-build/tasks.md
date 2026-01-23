## 1. Implementation
- [ ] 1.1 Reproduce the Windows failure in a clean environment and capture the full error (prefer GitHub Actions windows runner).
- [ ] 1.2 Implement a repo-level fix/workaround so `writenow-theia` can `yarn install` on Windows reliably (toolchain selection + deterministic Yarn usage).
- [ ] 1.3 Ensure `yarn build:electron` succeeds on Windows and record output.
- [ ] 1.4 Start Electron target on Windows long enough to confirm Theia shell starts (then terminate cleanly) and record output.
- [ ] 1.5 Archive Rulebook task `issue-117-theia-scaffold` into `rulebook/tasks/archive/` and validate Rulebook tasks.

## 2. Testing
- [ ] 2.1 Run OpenSpec strict validation and keep evidence in RUN_LOG.
- [ ] 2.2 If a Windows smoke workflow is added, run it and link the run in RUN_LOG.

## 3. Documentation
- [ ] 3.1 Update `writenow-theia/README.md` with Windows prerequisites + known pitfalls + validated commands.
- [ ] 3.2 Update `openspec/_ops/task_runs/ISSUE-119.md` with all commands, key outputs, and links to evidence.
