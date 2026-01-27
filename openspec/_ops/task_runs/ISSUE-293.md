# ISSUE-293

- Issue: #293
- Branch: task/293-local-llm-tab
- PR: <fill-after-created>

## Plan

- 更新 IPC contract（新增 `localLlm:*` 通道/类型）并生成各端 `ipc-generated.ts`
- 在 `writenow-frontend` Electron 主进程/Preload 实现 `localLlm` 调用面
- 增加 TipTap Tab 续写 extension 模块（停顿触发/ghost/Tab 接受/取消语义），补齐最小可验收测试证据

## Runs

### 2026-01-27 00:00 init

- Command: `gh issue create ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/293`
- Evidence: `rulebook/tasks/issue-293-local-llm-tab/*`, `openspec/_ops/task_runs/ISSUE-293.md`

### 2026-01-27 IPC contract + types generate

- Command: `npm run contract:generate`
- Key output: `localLlm:*` 通道进入 `ipc-generated.ts`（含 `localLlm:model:remove`），生成成功（exit 0）
- Evidence:
  - `electron/ipc/contract/ipc-contract.cjs`
  - `electron/ipc/localLlm.cjs`
  - `src/types/ipc-generated.ts`
  - `writenow-frontend/src/types/ipc-generated.ts`
  - `writenow-theia/writenow-core/src/common/ipc-generated.ts`

### 2026-01-27 node-llama-cpp 安装（writenow-frontend）

- Command: `NODE_LLAMA_CPP_SKIP_DOWNLOAD=true npm install node-llama-cpp --no-audit --no-fund --registry=https://registry.npmmirror.com --fetch-timeout=600000 --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000`
- Key output: `added 909 packages in 9m`（exit 0；有 EBADENGINE warn 但未阻断安装）
- Evidence:
  - `writenow-frontend/package.json`（新增依赖）
  - `writenow-frontend/package-lock.json`

### 2026-01-27 writenow-frontend 质量门禁（lint/test/build）

- Command: `npm run lint`
- Key output: `eslint .`（exit 0）
- Command: `npm test`
- Key output: `73 passed`（exit 0）
- Command: `npm run build && npm run build:electron`
- Key output: `tsc -b && vite build` + `electron-vite build`（均 exit 0）
- Evidence:
  - `writenow-frontend/electron/main.ts`
  - `writenow-frontend/electron/preload.ts`
  - `writenow-frontend/src/features/settings/SettingsPanel.tsx`
  - `writenow-frontend/src/features/write-mode/WriteModeEditorPanel.tsx`
  - `writenow-frontend/src/lib/editor/extensions/tab-completion.ts`
  - `writenow-frontend/src/lib/electron/useLocalLlm.ts`
  - `writenow-frontend/tests/e2e/local-llm-tab.spec.ts`

### 2026-01-27 Playwright Electron E2E（WSL 跳过）

- Command: `npm run test:e2e`
- Key output: `Running 3 tests ... 3 skipped`（WSL 环境自动跳过；exit 0）
- Evidence:
  - `writenow-frontend/tests/e2e/write-mode-ssot.spec.ts`
  - `writenow-frontend/tests/e2e/local-llm-tab.spec.ts`

