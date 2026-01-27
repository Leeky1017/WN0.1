# ISSUE-281
- Issue: #281
- Branch: task/281-write-mode-ssot
- PR: <fill-after-created>

## Plan
- 以 P0-001/002 为准：移除 `writenow-frontend` demo UI，接入真实 `file:*` + TipTap + AI 编排（单链路 SSOT）
- 以 `statusBarStore` + `editorFilesStore` 作为唯一真相，贯穿 Header/StatusBar/FileTree 的保存/dirty/连接状态
- 补齐最小可复现验证（lint/unit/e2e 其一或组合）并记录证据

## Runs
### 2026-01-27 00:00 Issue + Rulebook task + worktree
- Command: `gh issue create -t "[WRITE-MODE-IDE] P0-001/002: Write Mode SSOT + Save Status SSOT" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/281`
- Command: `rulebook task create issue-281-write-mode-ssot && rulebook task validate issue-281-write-mode-ssot`
- Key output: `Task issue-281-write-mode-ssot created successfully`
- Command: `git fetch origin && git worktree add -b task/281-write-mode-ssot .worktrees/issue-281-write-mode-ssot origin/main`
- Key output: `Preparing worktree (new branch 'task/281-write-mode-ssot')`

### 2026-01-27 12:00 Build + lint（writenow-frontend）
- Command: `cd writenow-frontend && npm ci`
- Key output: `added 768 packages`（含 engine warnings；install 成功）
- Command: `cd writenow-frontend && npm run lint`
- Key output: `eslint .`（exit 0）
- Command: `cd writenow-frontend && npm run build:electron`
- Key output: `dist-electron/main/index.cjs` / `dist-electron/preload/index.cjs` / `dist/assets/index-*.js` build success
- Evidence:
  - `writenow-frontend/src/features/write-mode/*`
  - `writenow-frontend/src/features/ai-panel/AIPanel.tsx`
  - `writenow-frontend/src/components/layout/{AppShell,header,footer}.tsx`

### 2026-01-27 12:10 Build backend（writenow-theia browser-app）
- Command: `npm run theia:build:browser`
- Key output: `theia build --mode development` + `compiled successfully`（生成 backend bundle）
- Evidence:
  - `writenow-theia/browser-app/lib/backend/main.js`

### 2026-01-27 12:20 E2E（Playwright）
- Command: `cd writenow-frontend && npm run test:e2e`
- Key output: 本机 WSL 环境 renderer crash（`render-process-gone reason=crashed exitCode=133`）；无法在当前环境稳定运行 Electron E2E
- Mitigation: 在测试中对 WSL 环境做 skip（CI/非 WSL 可继续跑）
- Command: `cd writenow-frontend && npx playwright test --reporter=line`
- Key output: `1 skipped`
- Evidence:
  - `writenow-frontend/playwright.config.ts`
  - `writenow-frontend/tests/e2e/write-mode-ssot.spec.ts`

