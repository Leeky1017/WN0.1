# ISSUE-330
- Issue: #330
- Branch: task/330-p3-001-litellm-proxy
- PR: <fill-after-created>

## Plan
- 在 `electron/ipc/ai.cjs` 增加 LiteLLM Proxy 可选路由（默认关闭），确保启用后单链路、失败语义可判定且不记录 prompt 明文。
- 补齐配置项解析：`ai.proxy.enabled/baseUrl/apiKey`（含 env 覆盖），并与现有 provider 配置优先级清晰。
- 增加 E2E：默认路径不依赖 Proxy；启用 Proxy 时通过环境变量 opt-in 覆盖关键 AI 请求（可观测）。

## Runs

### 2026-01-28 14:02 create issue
- Command: `gh issue create -t "[OPEN-SOURCE-OPT-P3] P3-001: LiteLLM Proxy（多模型统一，可选）" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/330`
- Evidence: Issue #330；task card `openspec/specs/sprint-open-source-opt/task_cards/p3/P3-001-litellm-proxy.md`

### 2026-01-28 14:03 worktree + rulebook task
- Command: `git fetch origin && git worktree add -b "task/330-p3-001-litellm-proxy" ".worktrees/issue-330-p3-001-litellm-proxy" origin/main && rulebook task create issue-330-p3-001-litellm-proxy`
- Key output: `✅ Task issue-330-p3-001-litellm-proxy created successfully`
- Evidence: `rulebook/tasks/issue-330-p3-001-litellm-proxy/`

### 2026-01-28 14:10 implement LiteLLM optional routing (WIP)
- Command: edit `electron/ipc/ai.cjs` + add E2E + add optional config docs
- Key output: add `ai.proxy.enabled/baseUrl/apiKey` env/config parsing + OpenAI-compatible streaming fetch path (default off)
- Evidence:
  - `electron/ipc/ai.cjs`
  - `tests/e2e/sprint-open-source-opt-litellm-proxy.spec.ts`
  - `litellm/README.md`, `litellm/litellm.config.yaml`

### 2026-01-28 14:23 build/lint (root/theia)
- Command: `npm run lint`
- Key output: `exit_code: 0`（包含 `contract:check` + `yarn --cwd writenow-theia/writenow-core build`）
- Evidence: terminal log + `writenow-theia/writenow-core/lib/**` build artifacts

### 2026-01-28 14:28 frontend deps + lint
- Command: `cd writenow-frontend && npm ci && npm run lint`
- Key output: `npm ci OK` + `eslint OK`
- Evidence: `writenow-frontend/node_modules/**`

### 2026-01-28 14:29 openspec validate
- Command: `npx openspec validate --changes`
- Key output: `No items found to validate.`

### 2026-01-28 14:31 openspec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output:
  - `Totals: 5 passed, 0 failed (5 items)`
