# P2-001: Playwright 真实 E2E —— 写作主路径 + 边界分支（取消/错误/恢复）

Status: done  
Issue: #314  
PR: https://github.com/Leeky1017/WN0.1/pull/315  
RUN_LOG: openspec/_ops/task_runs/ISSUE-314.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-001 |
| Phase | P2 - 质量门禁（真实 E2E） |
| 优先级 | P0 |
| 状态 | Done |
| 依赖 | P0-001, P0-002, P1-001 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-write-mode-ide/spec.md`（质量门禁 Requirement）
- [x] `design/03-quality-gates.md`（E2E 矩阵 + 诊断包）
- [x] `design/02-editor-performance.md`（E2E 中的 perf marks）
- [x] 现有基础设施：
  - [x] `playwright.config.ts`
  - [x] `tests/e2e/*`（现有 E2E 用例与约定）

## 目标

把 Write Mode 的质量变成“系统默认”：

1) 主路径可自动验证（启动→新建→输入→自动保存→重启恢复）
2) 边界分支必须覆盖（取消/超时/错误码）
3) 失败必须可诊断（trace + logs + screenshot）

## 任务清单

- [x] 1) 新增 Write Mode 专属用例集合
  - [x] 目录建议：`tests/e2e/write-mode/*.spec.ts`
  - [x] 或统一 tag：`@write-mode`（便于 CI 按需运行）
- [x] 2) 用例实现（最小硬门禁）
  - [x] WM-001：启动 → 新建文档 → 输入 → 自动保存（落盘断言）
  - [x] WM-002：Focus/Zen 切换（写作不中断）
  - [x] WM-003：AI run → diff → Accept（或至少 diff 可见）
  - [x] WM-004：AI 运行中 Esc 取消 → UI 清理 → editor 可继续输入
  - [x] WM-005：强制关闭 → 重启 → 恢复到最近 autosave（不丢稿）
- [x] 3) E2E 环境隔离（必须）
  - [x] 使用 `WN_USER_DATA_DIR=<tmp>`（禁止污染真实数据）
  - [x] 使用 `WN_E2E=1`、`WN_OPEN_DEVTOOLS=0`
  - [x] CI 环境必要时 `WN_DISABLE_GPU=1`
  - [x] 若存在欢迎页/更新弹窗：必须在 E2E 模式下可跳过（当前启动直达 Write Mode；如未来引入需在 `WN_E2E` 下禁用）
- [x] 4) 诊断包（失败必须可定位）
  - [x] Playwright trace：`trace: on-first-retry`（已配置）
  - [x] 失败时保存：screenshot + main.log
  - [x] CI 上传 artifact（保留 7 天）

## 验收标准

- [x] 可运行：`npx playwright test -g "@write-mode"`（或等价命令）
- [x] 每条用例都有明确断言（不是“跑完就算过”）
- [x] 失败时可以从 artifact 复现/定位（trace + logs）
- [x] 用例不依赖 stub/mock（真实 UI + 真实持久化 + 真实 RPC/IPC）

## 产出

- `tests/e2e/write-mode/*.spec.ts`（或新增 tag 用例）
- CI workflow（可选但推荐）：`.github/workflows/e2e-write-mode.yml`
- RUN_LOG：记录 E2E 命令与关键输出（按 AGENTS 规范）
