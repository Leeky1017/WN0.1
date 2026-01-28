# ISSUE-329
- Issue: #329
- Branch: task/329-ai-memory-p2-001-002
- PR: <fill-after-created>

## Plan
- 落地 P2-001：历史结果 Full → Compact 压缩（确定性序列化 + 可回溯引用 + 可观测压缩事件）
- 落地 P2-002：人物/设定文件化存储按需加载（预算裁剪 + 稳定错误码 + 引用可追溯）
- 补齐 E2E 与 RUN_LOG 证据；更新 task cards；创建 PR 并开启 auto-merge

## Runs
### 2026-01-28 Setup: Issue / Worktree
- Command: `gh issue create ... && git worktree add ...`
- Key output: `Issue #329`, worktree `.worktrees/issue-329-ai-memory-p2-001-002`
- Evidence: `openspec/_ops/task_runs/ISSUE-329.md`

### 2026-01-28 ipc-contract
- Command: `npm run contract:check`
- Key output: `contract:check exit 0 (no drift)`
- Evidence: `scripts/ipc-contract-sync.js`, `src/types/ipc-generated.ts`

### 2026-01-28 openspec
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 5 passed, 0 failed (5 items)`
- Evidence: `openspec/specs/**`

### 2026-01-28 frontend deps
- Command: `cd writenow-frontend && npm ci`
- Key output: `added 910 packages, and audited 911 packages in 11s`
- Evidence: `writenow-frontend/node_modules/`, `writenow-frontend/package-lock.json`

### 2026-01-28 frontend lint
- Command: `cd writenow-frontend && npm run lint`
- Key output: `eslint .` (no errors)
- Evidence: `writenow-frontend/src/**`, `writenow-frontend/tests/**`

### 2026-01-28 frontend unit tests
- Command: `cd writenow-frontend && npm test`
- Key output: `Test Files 4 passed (73 tests)`
- Evidence: `writenow-frontend/src/lib/ai/context-assembler.test.ts`

### 2026-01-28 frontend build (electron)
- Command: `cd writenow-frontend && npm run build:electron`
- Key output: `dist-electron/*` + `dist/*` built
- Evidence: `writenow-frontend/dist/`, `writenow-frontend/dist-electron/`

### 2026-01-28 repo lint (theia build)
- Command: `npm run lint`
- Key output: `writenow-core: $ tsc` (no errors)
- Evidence: `writenow-theia/writenow-core/src/node/**`

