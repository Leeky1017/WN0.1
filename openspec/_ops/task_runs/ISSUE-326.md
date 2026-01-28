# ISSUE-326
- Issue: #326
- Branch: task/326-p3-001-packaging-offline
- PR: https://github.com/Leeky1017/WN0.1/pull/331

## Plan
- 固化打包流水线：强制构建 Theia backend → 校验/补齐随包资源 → 再执行 electron-builder
- 离线随包：字体本地化（不依赖 Google Fonts）；本地模型可随包且可被识别/按需复制到 userData
- 提供可自动化验收（脚本或 E2E smoke），并记录可取证日志（main.log）

## Runs
### 2026-01-28 05:20 Issue + worktree
- Command: `gh issue create -t "[WRITE-MODE-IDE] P3-001: 打包与离线（随包资源策略）" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/326`
- Command: `git worktree add -b task/326-p3-001-packaging-offline .worktrees/issue-326-p3-001-packaging-offline origin/main`
- Key output: `Preparing worktree (new branch 'task/326-p3-001-packaging-offline')`

### 2026-01-28 05:23 Rulebook task bootstrap
- Command: `rulebook task create issue-326-p3-001-packaging-offline && rulebook task validate issue-326-p3-001-packaging-offline`
- Key output: task created + validate ok (warning: missing specs)
- Evidence: `rulebook/tasks/issue-326-p3-001-packaging-offline/`

### 2026-01-28 13:30 Packaging implementation
- Evidence: `writenow-frontend/electron-builder.json`, `writenow-frontend/scripts/prepare-packaging.mjs`, `writenow-frontend/scripts/smoke-packaged.mjs`
- Evidence: `openspec/specs/sprint-write-mode-ide/design/05-packaging.md`

### 2026-01-28 13:54 Unit tests (frontend)
- Command: `cd writenow-frontend && npm test`
- Key output: `73 passed (73)`

### 2026-01-28 14:08 Lint (frontend)
- Command: `cd writenow-frontend && npm run lint`
- Key output: exit 0

### 2026-01-28 14:15 Prepare packaging (build Theia backend)
- Command: `cd writenow-frontend && node scripts/prepare-packaging.mjs`
- Key output: `theia:build:browser` completed (webpack warnings only); prepare script exit 0

### 2026-01-28 14:18 OpenSpec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 5 passed, 0 failed (5 items)`

### 2026-01-28 14:25 Packaged build smoke (linux --dir)
- Command: `cd writenow-frontend && npm run package:linux -- --dir`
- Key output: `release/0.0.0/linux-unpacked` produced (electron-builder exit 0)
- Command: `cd writenow-frontend && npm run package:smoke`
- Key output: exit 0

### 2026-01-28 14:55 Packaged launch smoke (linux)
- Command: `cd writenow-frontend && WN_SMOKE_LAUNCH=1 npm run package:smoke`
- Key output: backend reached `[backend] ready`; renderer crashed in WSL smoke (`render-process-gone exitCode=133`) — see `/tmp/writenow-packaging-smoke-*/logs/main.log`
- Key hint: app stderr shows `platform_shared_memory_region_posix.cc` failures when creating shared memory under `/tmp` (WSL environment-specific)

### 2026-01-28 14:55 Packaged launch smoke (linux)
- Command: `cd writenow-frontend && WN_SMOKE_LAUNCH=1 npm run package:smoke`
- Key output: backend reached `[backend] ready`; renderer crashed in WSL smoke (`render-process-gone exitCode=133`) — see `/tmp/writenow-packaging-smoke-*/logs/main.log`

### 2026-01-28 15:20 Packaged launch smoke (WSL2)
- Command: `cd writenow-frontend && WN_SMOKE_LAUNCH=1 npm run package:smoke`
- Key output: exit 0; `main.log` contains `[backend] ready` + `[renderer] did-finish-load`
- Note: launch smoke 默认不再强制 `WN_DISABLE_GPU=1`；在 WSL2 上若强制 `WN_DISABLE_GPU=1` 可能触发 Chromium shared memory 相关 renderer crash

