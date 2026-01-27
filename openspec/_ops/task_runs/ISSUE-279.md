# ISSUE-279

- Issue: #279
- Branch: task/279-ai-memory-prompt-caching
- PR: https://github.com/Leeky1017/WN0.1/pull/280

## Plan

- 落地 `context_rules`：SKILL 解析/校验/持久化 + renderer 按需注入
- 落地 Stable Prefix：Layer 0–3 固定模板 + `stablePrefixHash`，并接入 Anthropic Prompt Caching
- 补齐 IPC contract 同步与 E2E 证据，完成 task cards 勾选并创建 PR（auto-merge）

## Runs

### 2026-01-27 Setup: Issue / Worktree / Rulebook task

- Command: `gh issue create && git worktree add && rulebook task create/validate`
- Key output: Issue #279, worktree `.worktrees/issue-279-ai-memory-prompt-caching`, rulebook task valid
- Evidence: `rulebook/tasks/issue-279-ai-memory-prompt-caching/`

### 2026-01-27 IPC contract sync + Theia build gate

- Command: `npm run contract:generate && npm run contract:check && npm run lint`
- Key output: contract:check ok, writenow-theia/writenow-core tsc build ok
- Evidence: `src/types/ipc-generated.ts`, `writenow-theia/writenow-core/src/common/ipc-generated.ts`, `writenow-frontend/src/types/ipc-generated.ts`

### 2026-01-27 Unit tests: Stable Prefix invariants (standalone frontend)

- Command: `npm ci && npm test` (cwd: writenow-frontend)
- Key output: vitest `73 passed`; verifies: system prompt stable across instruction changes, unknown `context_rules` rejected
- Evidence: `writenow-frontend/src/lib/ai/context-assembler.test.ts`

### 2026-01-27 Smoke: injected.refs validation + prompt hashes (Theia ai-service)

- Command: `yarn --cwd writenow-theia/writenow-core build && node scripts/ai-injected-refs-smoke.cjs` (cwd: writenow-theia/writenow-core)
- Key output: invalid refs -> `INVALID_ARGUMENT`; ok start response includes `injected.refs` (sorted/dedup) and `prompt.stablePrefixHash`/`prompt.promptHash`
- Evidence: `writenow-theia/writenow-core/scripts/ai-injected-refs-smoke.cjs`
