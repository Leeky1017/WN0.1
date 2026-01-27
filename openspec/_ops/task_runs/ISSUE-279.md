# ISSUE-279

- Issue: #279
- Branch: task/279-ai-memory-prompt-caching
- PR: (pending)

## Plan

- 落地 `context_rules`：SKILL 解析/校验/持久化 + renderer 按需注入
- 落地 Stable Prefix：Layer 0–3 固定模板 + `stablePrefixHash`，并接入 Anthropic Prompt Caching
- 补齐 IPC contract 同步与 E2E 证据，完成 task cards 勾选并创建 PR（auto-merge）

## Runs

### 2026-01-27 Setup: Issue / Worktree / Rulebook task

- Commands:
  - `gh issue create -t "Phase 1: ai-memory context_rules + stable prefix + prompt caching" -b "<...>"`
  - `git worktree add -b "task/279-ai-memory-prompt-caching" ".worktrees/issue-279-ai-memory-prompt-caching" origin/main`
  - `rulebook task create "issue-279-ai-memory-prompt-caching" && rulebook task validate "issue-279-ai-memory-prompt-caching"`
- Key output:
  - Issue: `https://github.com/Leeky1017/WN0.1/issues/279`
  - Worktree: `.worktrees/issue-279-ai-memory-prompt-caching`
  - Rulebook task: `rulebook/tasks/issue-279-ai-memory-prompt-caching/` (valid, pending specs)
- Evidence:
  - `openspec/_ops/task_runs/ISSUE-279.md`
  - `rulebook/tasks/issue-279-ai-memory-prompt-caching/`

### 2026-01-27 IPC contract sync + Theia build gate

- Commands:
  - `npm run contract:generate`
  - `npm run contract:check`
  - `npm run lint`
- Key output:
  - `contract:check` ok
  - `writenow-theia/writenow-core` `tsc` build ok
- Evidence:
  - `scripts/ipc-contract-sync.js`
  - `src/types/ipc-generated.ts`
  - `writenow-theia/writenow-core/src/common/ipc-generated.ts`
  - `writenow-frontend/src/types/ipc-generated.ts`

### 2026-01-27 Unit tests: Stable Prefix invariants (standalone frontend)

- Commands:
  - `npm ci` (cwd: `writenow-frontend`)
  - `npm test` (cwd: `writenow-frontend`)
- Key output:
  - vitest: `73 passed`
  - verifies: system prompt stable across instruction changes; unknown `context_rules` rejected
- Evidence:
  - `writenow-frontend/src/lib/ai/context-assembler.test.ts`

### 2026-01-27 Smoke: injected.refs validation + prompt hashes (Theia ai-service)

- Commands:
  - `yarn --cwd writenow-theia/writenow-core build`
  - `node scripts/ai-injected-refs-smoke.cjs` (cwd: `writenow-theia/writenow-core`)
- Key output:
  - invalid refs -> `INVALID_ARGUMENT`
  - ok start response includes `injected.refs` (sorted/dedup) and `prompt.stablePrefixHash`/`prompt.promptHash`
  - script: `[ai-injected-refs-smoke] ok`
- Evidence:
  - `writenow-theia/writenow-core/scripts/ai-injected-refs-smoke.cjs`

