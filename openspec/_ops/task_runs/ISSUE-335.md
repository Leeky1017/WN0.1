# ISSUE-335
- Issue: #335
- Branch: task/335-litellm-settings-ui
- PR: https://github.com/Leeky1017/WN0.1/pull/336

## Plan
- 在 Settings 面板中添加 "AI 代理（高级）" 配置区块，允许用户启用/禁用 LiteLLM Proxy 并配置 baseUrl/apiKey
- 新增 IPC 通道：`ai:proxy:settings:get`、`ai:proxy:settings:update`、`ai:proxy:test`
- 配置持久化到 SQLite，环境变量保持向后兼容优先级

## Runs

### 2026-01-28 14:57 create issue
- Command: `gh issue create -t "[OPEN-SOURCE-OPT-P3] P3-002: LiteLLM Proxy Settings UI" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/335`
- Evidence: Issue #335

### 2026-01-28 14:58 worktree + rulebook task
- Command: `git fetch origin && git worktree add -b "task/335-litellm-settings-ui" ".worktrees/issue-335-litellm-settings-ui" origin/main && rulebook task create issue-335-litellm-settings-ui`
- Key output: `✅ Task issue-335-litellm-settings-ui created successfully`
- Evidence: `rulebook/tasks/issue-335-litellm-settings-ui/`

### 2026-01-28 15:10 implement IPC contract + handlers
- Command: edit `electron/ipc/contract/ipc-contract.cjs`, `electron/ipc/ai.cjs`, run `npm run contract:generate`
- Key output: added `AiProxySettings` types + `ai:proxy:settings:get/update/test` handlers
- Evidence:
  - `electron/ipc/contract/ipc-contract.cjs`
  - `electron/ipc/ai.cjs`
  - `src/types/ipc-generated.ts`

### 2026-01-28 15:25 implement Theia backend handlers
- Command: edit `writenow-theia/writenow-core/src/node/services/ai-service.ts`, `writenow-theia/writenow-core/src/node/writenow-backend-service.ts`
- Key output: added db-aware resolve functions + registered handlers
- Evidence:
  - `writenow-theia/writenow-core/src/node/services/ai-service.ts`
  - `writenow-theia/writenow-core/src/node/writenow-backend-service.ts`

### 2026-01-28 15:40 implement frontend Settings UI
- Command: edit `writenow-frontend/src/features/settings/SettingsPanel.tsx`, create `writenow-frontend/src/lib/rpc/useAiProxySettings.ts`
- Key output: added `AiProxySection` component + `useAiProxySettings` hook
- Evidence:
  - `writenow-frontend/src/features/settings/SettingsPanel.tsx`
  - `writenow-frontend/src/lib/rpc/useAiProxySettings.ts`

### 2026-01-28 15:50 lint + build verification
- Command: `cd writenow-frontend && npm run lint && npm run build`
- Key output: lint OK, build OK
- Evidence: `writenow-frontend/dist/`

### 2026-01-28 16:00 PR created
- Command: `gh pr create --title "feat(settings): add LiteLLM Proxy Settings UI" --body "..." --base main`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/336`
- Evidence: PR #336

### 2026-01-28 17:55 fix RUN_LOG format for openspec-log-guard
- Command: rewrite `openspec/_ops/task_runs/ISSUE-335.md` to match required format
- Key output: RUN_LOG now includes required header, issue/branch lines, Plan section, and Command/Key output/Evidence entries
- Evidence: `openspec/_ops/task_runs/ISSUE-335.md`
