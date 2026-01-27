# Proposal: issue-303-p2-001-e2e-playwright

## Why
OpenSpec 要求 Playwright（含 Electron）必须对核心创作路径与 AI 边界分支提供“真实 E2E”覆盖，并作为质量门禁。

当前仓库 E2E 基础设施存在以下问题/缺口：
- 运行入口与约定不够统一（Electron 启动参数、userData 隔离、日志/trace 证据收集方式分散）。
- 核心创作主路径缺少“关闭重开验证持久化”的硬断言。
- AI 用例缺少可在 CI 运行的边界分支覆盖（取消/超时/上游错误）与标准化诊断包（trace + screenshot + main.log）。

## What Changes
- 统一 Playwright Electron E2E 测试基础设施（tests/e2e）：提供可复用的 launch helper（隔离 `WN_USER_DATA_DIR`、统一 env），并在失败时自动收集可定位证据（trace/screenshot/main.log）。
- 补齐至少 1 条“核心创作主路径”用例：启动 → 新建/打开文档 → 编辑 → 保存/自动保存 → 关闭重开验证持久化。
- 补齐至少 1 条“AI 路径”用例并覆盖 2 个边界分支（`CANCELED` / `TIMEOUT` / `UPSTREAM_ERROR`），同时确保失败可诊断。

## Impact
- Affected specs:
  - `openspec/specs/sprint-open-source-opt/spec.md`
  - `openspec/specs/sprint-write-mode-ide/design/03-quality-gates.md`
  - `openspec/specs/api-contract/spec.md`（错误码语义引用）
- Affected code:
  - `tests/e2e/**`
  - `playwright.config.ts`（如需调整 trace/retries/diagnostics）
- Breaking change: NO
- User benefit: E2E 回归门禁可复现、可诊断，降低“丢稿/竞态/AI 状态卡死”等高风险回归进入主干的概率。
