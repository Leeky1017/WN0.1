# ISSUE-137
- Issue: #137
- Branch: task/137-p1-basic-layout
- PR: https://github.com/Leeky1017/WN0.1/pull/138

## Plan
- Brand `writenow-theia` as WriteNow (title/productName/icons + dark theme default).
- Establish base layout skeleton (left Explorer, main editor, right placeholder panel; Activity Bar trimmed).
- Verify Browser + Electron targets and capture screenshot evidence.

## Runs
### 2026-01-23 21:02 Issue + worktree
- Command: `gh issue create -t "[SPRINT-THEIA-MIGRATION] Phase 1 / Task 007: Basic Layout + Branding" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/137`
- Command: `git fetch origin`
- Key output: `(no output)`
- Command: `git worktree add -b "task/137-p1-basic-layout" ".worktrees/issue-137-p1-basic-layout" origin/main`
- Key output: `Preparing worktree (new branch 'task/137-p1-basic-layout')`

### 2026-01-23 21:02 Rulebook task
- Command: `rulebook task create issue-137-p1-basic-layout`
- Key output: `Location: rulebook/tasks/issue-137-p1-basic-layout/`

### 2026-01-23 21:12 Rulebook spec-first
- Command: `rulebook task validate issue-137-p1-basic-layout`
- Key output: `✅ Task issue-137-p1-basic-layout is valid`
- Evidence: `rulebook/tasks/issue-137-p1-basic-layout/{proposal.md,tasks.md,specs/basic-layout/spec.md}`

### 2026-01-23 22:49 Branding + layout implementation (code review anchor)
- Command: `git status -sb`
- Key output: `M writenow-theia/{browser-app,electron-app}/package.json ... + new writenow-core browser widgets/contribution`
- Evidence:
  - `writenow-theia/browser-app/package.json`
  - `writenow-theia/electron-app/package.json`
  - `writenow-theia/writenow-core/src/browser/writenow-layout-contribution.ts`
  - `writenow-theia/writenow-core/src/browser/writenow-welcome-widget.tsx`
  - `writenow-theia/writenow-core/src/browser/writenow-ai-panel-placeholder-widget.tsx`
  - `writenow-theia/resources/`

### 2026-01-23 22:49 Build (Browser target)
- Command: `cd writenow-theia && yarn build:browser`
- Key output: `webpack ... compiled ...`
- Evidence: `writenow-theia/browser-app/lib/frontend/ (generated, gitignored)`

### 2026-01-23 22:52 Verify (Browser target smoke)
- Command: `cd writenow-theia && node scripts/p1-007-layout-branding-smoke.cjs`
- Key output:
  - `[p1-007] page title: "Welcome - ... - WriteNow"`
  - `[p1-007] PASS`
  - `artifacts: /tmp/writenow-theia-layout-artifacts-z8OGgR`
- Evidence:
  - Screenshot: `/tmp/writenow-theia-layout-artifacts-z8OGgR/03-after-open-test.md.png`
  - Screenshot: `/tmp/writenow-theia-layout-artifacts-z8OGgR/03-after-open-second.md.png`

### 2026-01-23 22:56 Verify (Electron target smoke)
- Command: `cd writenow-theia && node scripts/p1-007-electron-ui-smoke.cjs`
- Key output:
  - `[p1-007/electron] title: "Welcome - electron-app - WriteNow"`
  - `[p1-007/electron] PASS`
  - `artifacts: /tmp/writenow-theia-electron-artifacts-h8rqQL`
- Evidence:
  - Screenshot: `/tmp/writenow-theia-electron-artifacts-h8rqQL/electron-startup.png`

### 2026-01-23 23:01 Build (Electron target, baseline failure)
- Command: `cd writenow-theia && yarn build:electron`
- Key output: `pkg-config: not found (native-keymap rebuild failed)`
- Evidence: `openspec/_ops/task_runs/ISSUE-137.md (this entry)`

### 2026-01-23 23:10 Build (Electron target, sysdeps env workaround)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root PATH=\"$SYSROOT/usr/bin:$PATH\" PKG_CONFIG_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig\" PKG_CONFIG_SYSROOT_DIR=\"$SYSROOT\" LD_LIBRARY_PATH=\"$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\" yarn build:electron`
- Key output:
  - `✔ Rebuild Complete`
  - `webpack ... compiled successfully`
- Evidence: `writenow-theia/electron-app/lib/ (generated, gitignored)`

### 2026-01-23 23:23 Typecheck/build (writenow-core)
- Command: `cd writenow-theia && yarn --cwd writenow-core build`
- Key output: `Done in 1.94s.`
- Evidence: `writenow-theia/writenow-core/lib/ (generated, gitignored)`

### 2026-01-23 23:24 OpenSpec gate
- Command: `openspec validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed`
- Evidence: `openspec/specs/**/spec.md`

### 2026-01-24 01:42 PR
- Command: `gh pr create --title "[SPRINT-THEIA-MIGRATION] P1/T007 Basic Layout + Branding (#137)" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/138`
- Evidence: `openspec/_ops/task_runs/ISSUE-137.md (PR link filled)`
