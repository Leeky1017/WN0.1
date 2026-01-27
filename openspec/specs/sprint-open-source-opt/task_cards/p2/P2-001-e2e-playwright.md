# P2-001: 完善 Playwright E2E 测试覆盖核心用户流程

Status: done  
Issue: #303  
PR: https://github.com/Leeky1017/WN0.1/pull/304  
RUN_LOG: openspec/_ops/task_runs/ISSUE-303.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-001 |
| Phase | 2 - 质量门禁 |
| 优先级 | P0 |
| 状态 | Done |
| 依赖 | P1-001/P1-002（AI 相关用例建议随功能落地同步补齐） |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-open-source-opt/spec.md`
- [x] `openspec/specs/sprint-open-source-opt/design/00-overview.md`（E2E 作为门禁的定位）
- [x] `docs/testing-standards.md`
- [x] `openspec/specs/api-contract/spec.md`（错误码：TIMEOUT/CANCELED 等）

## 目标

- 用真实 E2E 覆盖写作 IDE 的关键用户路径，作为合并门禁。
- 覆盖失败/取消/超时等边界分支，并留下可定位证据（trace/screenshot/log）。

## 任务清单

- [x] 盘点现有 E2E 运行方式（Electron 启动参数、测试隔离、userData 目录）。
- [x] 核心路径用例（必须真实持久化）：
  - [x] 启动应用 → 创建项目/打开项目
  - [x] 新建/打开文档 → 编辑 → 保存/自动保存
  - [x] 关闭重开 → 验证内容未丢失
- [x] AI 路径用例（随功能落地补齐）：
  - [x] AI 改写（Diff 显示、Accept/Reject）
  - [x] Tab 续写（ghost、Tab、Esc、继续输入取消）
- [x] 边界分支：
  - [x] 取消（CANCELED）
  - [x] 超时（TIMEOUT）
  - [x] 上游错误（UPSTREAM_ERROR）
- [x] 证据：统一启用 Playwright trace，并在失败时自动保存。

## 验收标准

- [x] E2E 用例在本地与 CI 可稳定运行（可复现，且不会污染本地 userData）。
- [x] 覆盖至少 1 条“创作主路径”与 1 条“AI 路径”，并包含 2 个边界分支。
- [x] 任何失败都能通过 trace/screenshot 定位原因。

## 产出

- 测试：新增/完善 Playwright E2E 用例（真实 UI + 真实持久化）。
- 工具：必要的 E2E 运行脚本/说明（如隔离 userData 参数）。
