# Tasks: issue-27-sprint-4-release-impl

## Checklist
- [ ] Add `openspec/_ops/task_runs/ISSUE-27.md`
- [ ] Implement task 001: electron-updater + update UI
- [ ] Implement task 002: export Markdown
- [ ] Implement task 003: export Word + PDF
- [ ] Implement task 004: i18next (zh-CN/en) + persisted toggle
- [ ] Implement task 005: publish adapter + clipboard copy + warnings
- [ ] Add E2E coverage for update/export/i18n/publish
- [ ] Run `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- [ ] Run `npm test` / `npm run lint` / `npm run test:e2e`
- [ ] Create PR with `Closes #27` and enable auto-merge

## Acceptance
- All Scenarios in `openspec/specs/sprint-4-release/spec.md` are satisfied.
- Failures are user-readable and leave disk evidence (logs / exported files).
- E2E runs the real user path end-to-end on Electron.

