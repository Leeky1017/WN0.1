# ISSUE-394

- Issue: #394
- Branch: task/394-cleanup-legacy-frontend
- PR: https://github.com/Leeky1017/WN0.1/pull/395

## Plan

- 迁移 writenow-frontend 测试到根目录 tests/e2e/
- 删除 writenow-frontend/ 和 writenow-theia browser 层
- 更新 writenow-spec 前端基线为 writenow-ui

## Runs

### 2026-01-30 Phase 1: 测试迁移

- Command: `mkdir -p tests/e2e/_utils tests/e2e/write-mode tests/e2e/perf`
- Key output: 创建目录结构

- Command: 迁移 3 个工具函数
  - `tests/e2e/_utils/writenow.ts`
  - `tests/e2e/_utils/fake-anthropic.ts`
  - `tests/e2e/_utils/fake-litellm.ts`

- Command: 迁移 10 个测试文件
  - `tests/e2e/local-llm-tab.spec.ts`
  - `tests/e2e/perf/perf-budgets.spec.ts`
  - `tests/e2e/write-mode/` 下 8 个文件（含路径修改）

- Evidence: 无 linter 错误

### 2026-01-30 Phase 2: 删除旧前端

- Command: `rm -rf writenow-frontend/`
- Key output: 删除 writenow-frontend 目录（~50+ 文件）

- Command: `rm -rf writenow-theia/writenow-core/src/browser/`
- Key output: 删除 Theia browser 层（72 文件）

- Command: 删除 CI 工作流
  - `.github/workflows/e2e-write-mode.yml`
  - `.github/workflows/e2e-perf.yml`

### 2026-01-30 Phase 3: 更新规范

- Command: 更新 `openspec/specs/writenow-spec/spec.md`
- Key output:
  - 前端基线: `writenow-frontend/` → `writenow-ui/`
  - 代码基线: 仅保留后端服务 `writenow-core/src/node/`
  - 通信层: WebSocket JSON-RPC → Electron IPC
