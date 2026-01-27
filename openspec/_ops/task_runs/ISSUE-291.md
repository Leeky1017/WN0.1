# ISSUE-291
- Issue: #291
- Branch: task/291-p1-001-ai-diff-extension
- PR: <fill-after-created>

## Plan
- 补齐 rulebook task（proposal/tasks/delta spec）并保持与 Sprint 规范一致
- 新增 AI Diff 扩展核心能力（Plugin + DecorationSet + commands）
- 通过 lint/typecheck + OpenSpec/Rulebook 校验后提交 PR（含 auto-merge）

## Runs
### 2026-01-27 21:12 Issue
- Command: `gh issue create -t "[open-source-opt] P1-001: AI Diff Extension (core plugin + commands)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/291`
- Evidence: `openspec/specs/sprint-open-source-opt/spec.md`, `openspec/specs/sprint-open-source-opt/task_cards/p1/P1-001-ai-diff-extension.md`

### 2026-01-27 21:13 worktree
- Command: `git fetch origin && git worktree add -b "task/291-p1-001-ai-diff-extension" ".worktrees/issue-291-p1-001-ai-diff-extension" origin/main`
- Key output: `Preparing worktree (new branch 'task/291-p1-001-ai-diff-extension')`
- Evidence: `.worktrees/issue-291-p1-001-ai-diff-extension/`

### 2026-01-27 21:14 rulebook
- Command: `rulebook task create issue-291-p1-001-ai-diff-extension && rulebook task validate issue-291-p1-001-ai-diff-extension`
- Key output: `✅ Task issue-291-p1-001-ai-diff-extension is valid`
- Evidence: `rulebook/tasks/issue-291-p1-001-ai-diff-extension/`

### 2026-01-27 21:15 openspec
- Command: `openspec validate --specs --strict --no-interactive`
- Key output: `Totals: 5 passed, 0 failed (5 items)`
- Evidence: `openspec/specs/`

### 2026-01-27 21:16 deps (frontend)
- Command: `npm ci`
- Key output: `added 768 packages, and audited 769 packages in 12s`
- Evidence: `writenow-frontend/package-lock.json`, `writenow-frontend/node_modules/`

### 2026-01-27 21:17 lint (frontend)
- Command: `npm run lint`
- Key output: `eslint . (no errors)`
- Evidence: `writenow-frontend/src/lib/editor/extensions/ai-diff.ts`

### 2026-01-27 21:18 build (frontend)
- Command: `npm run build`
- Key output: `vite.config.ts: Unused '@ts-expect-error' directive`
- Evidence: `writenow-frontend/vite.config.ts`
- Fix: removed unused `@ts-expect-error` in `writenow-frontend/vite.config.ts`
- Command: `npm run build`
- Key output: `tsc -b` + `vite build ✓ built`
- Evidence: `writenow-frontend/vite.config.ts`, `writenow-frontend/dist/`
