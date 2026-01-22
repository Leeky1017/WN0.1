# ISSUE-94
- Issue: #94
- Branch: task/94-skill-v2-w1
- PR: https://github.com/Leeky1017/WN0.1/pull/101

## Plan
- Implement SKILL System V2 Wave 1 tasks (001-004)
- Keep builtin skills usable end-to-end
- Ship with tests + runnable evidence

## Runs
### 2026-01-21 00:00 bootstrap
- Command: `gh issue create -t "[SKILL-V2-W1] Skill System V2 - Wave 1 (001-004)" -b "<acceptance...>"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/94`
- Evidence: `openspec/_ops/task_runs/ISSUE-94.md`

### 2026-01-21 00:00 worktree
- Command: `git fetch origin && git worktree add -b task/94-skill-v2-w1 .worktrees/issue-94-skill-v2-w1 origin/main`
- Key output: `Preparing worktree (new branch 'task/94-skill-v2-w1')`
- Evidence: `.worktrees/issue-94-skill-v2-w1/`

### 2026-01-22 00:10 V2 parser + validator (Task 001)
- Command: `npx vitest run`
- Key output: `Test Files 14 passed (14) / Tests 40 passed (40)`
- Evidence: `src/lib/skills/v2/parser.ts`, `src/lib/skills/v2/validator.ts`, `src/lib/skills/v2/skill-md.test.ts`

### 2026-01-22 00:20 Skill indexing + IPC + UI (Task 002/003)
- Command: `npm run contract:check`
- Key output: `exit 0`
- Evidence: `electron/ipc/contract/ipc-contract.cjs`, `src/types/ipc-generated.ts`, `electron/preload.cjs`

### 2026-01-22 00:30 Skill Studio E2E (Task 004)
- Command: `npm run build`
- Key output: `✓ built`
- Evidence: `src/components/SkillStudio/index.tsx`
- Command: `npx playwright test tests/e2e/skill-system-v2-studio.spec.ts`
- Key output: `2 passed`
- Evidence: `tests/e2e/skill-system-v2-studio.spec.ts`

### 2026-01-22 00:35 E2E: indexer + list (Task 002/003)
- Command: `npx playwright test tests/e2e/skill-system-v2-indexer.spec.ts`
- Key output: `3 passed`
- Evidence: `electron/services/skills/SkillIndexService.cjs`, `electron/database/schema.sql`, `tests/e2e/skill-system-v2-indexer.spec.ts`
- Command: `npx playwright test tests/e2e/skill-system-v2-ui-list.spec.ts`
- Key output: `2 passed`
- Evidence: `src/components/AI/SkillList.tsx`, `tests/e2e/skill-system-v2-ui-list.spec.ts`

### 2026-01-22 00:45 Theme baseline snapshot refresh
- Command: `npx playwright test tests/e2e/frontend-theme-visual.spec.ts --update-snapshots`
- Key output: `frontend-theme-dark-linux.png is re-generated`
- Evidence: `tests/e2e/frontend-theme-visual.spec.ts-snapshots/frontend-theme-dark-linux.png`, `tests/e2e/frontend-theme-visual.spec.ts-snapshots/frontend-theme-light-linux.png`

### 2026-01-22 00:55 Rebase onto origin/main
- Command: `git fetch origin && git rebase origin/main`
- Key output: `CONFLICT (content): ... frontend-theme-visual ...png`
- Evidence: `git status`

### 2026-01-22 01:05 Lint + push + PR
- Command: `npm run lint`
- Key output: `0 errors (warnings only)`
- Evidence: `src/lib/skills/v2/skill-md.test.ts`
- Command: `git push -u origin task/94-skill-v2-w1`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/new/task/94-skill-v2-w1`
- Evidence: `origin/task/94-skill-v2-w1`
- Command: `gh pr create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/101`
- Evidence: https://github.com/Leeky1017/WN0.1/pull/101
- Command: `gh pr merge 101 --auto --squash`
- Key output: `exit 0`
- Evidence: https://github.com/Leeky1017/WN0.1/pull/101

### 2026-01-22 01:10 Task cards + RUN_LOG closeout
- Command: `apply_patch openspec/specs/skill-system-v2/tasks/001-004-*.md`
- Key output: `set Status: done + check all acceptance criteria`
- Evidence: `openspec/specs/skill-system-v2/tasks/001-skill-md-format-and-validator.md`, `openspec/specs/skill-system-v2/tasks/002-skill-discovery-and-index-service.md`, `openspec/specs/skill-system-v2/tasks/003-skill-management-ipc-and-ui-list.md`, `openspec/specs/skill-system-v2/tasks/004-skill-studio-manual-create-edit.md`
- Command: `apply_patch openspec/_ops/task_runs/ISSUE-94.md && apply_patch rulebook/tasks/issue-94-skill-v2-w1/tasks.md`
- Key output: `fill PR link + mark checklists done`
- Evidence: `openspec/_ops/task_runs/ISSUE-94.md`, `rulebook/tasks/issue-94-skill-v2-w1/tasks.md`

### 2026-01-22 01:15 OpenSpec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 12 passed, 0 failed (12 items)`
- Evidence: `openspec/specs/skill-system-v2/spec.md`
