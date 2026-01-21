## 1. Implementation
- [ ] 1.1 Implement V2 `SKILL.md` types/parser/validator (Task 001)
- [ ] 1.2 Add SkillIndexService + DB schema extension + file watching (Task 002)
- [ ] 1.3 Add IPC: skill:list/read/toggle (+ create/update/write) + renderer SkillList (Task 003)
- [ ] 1.4 Add Skill Studio UI create/edit/preview/save (Task 004)
- [ ] 1.5 Migrate builtin 3 skills to shipped `SKILL.md` and keep AI flow unchanged

## 2. Testing
- [ ] 2.1 Unit tests for parser/validator (semver, missing fields, oversize, refs slots)
- [ ] 2.2 E2E: skill discovery/index updates on create/edit/delete
- [ ] 2.3 E2E: invalid skill visible and non-blocking
- [ ] 2.4 E2E: Skill Studio create/edit + validation failure path

## 3. OpenSpec / Delivery
- [ ] 3.1 Update `openspec/specs/skill-system-v2/tasks/001-004-*` checkboxes and completion metadata
- [ ] 3.2 Update `openspec/_ops/task_runs/ISSUE-94.md` with commands + evidence
