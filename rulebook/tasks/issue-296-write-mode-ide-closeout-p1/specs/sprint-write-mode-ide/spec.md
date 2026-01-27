# Sprint delta: write-mode-ide closeout (P1-001 / P1-002)

Issue: #296
Related implementation: #292 / PR #295

## Scope

- 将 `sprint-write-mode-ide` 的以下 task cards 标记为完成态，并补齐可追溯元信息：
  - P1-001 Command Palette UI
  - P1-002 Focus/Zen 模式
- 同步 `openspec/specs/writenow-spec/spec.md` 的进度信息，确保 SSOT 与实现状态一致。

## Requirements

### R1. Task card closeout

- P1-001 与 P1-002 task card 必须满足：
  - 验收标准/清单从 `- [ ]` 变为 `- [x]`（不遗漏）
  - 顶部补齐完成元数据（示例字段）：
    - `Status: done`
    - `Issue: #292`
    - `PR: https://github.com/Leeky1017/WN0.1/pull/295`
    - `RUN_LOG: openspec/_ops/task_runs/ISSUE-292.md`

### R2. SSOT progress sync

- 当 task cards 被标记完成（`[ ] -> [x]`）时，必须同步更新 `openspec/specs/writenow-spec/spec.md` 中对应的路线图/进度描述（不要求新增新机制，但必须能反映 P1-001/002 已完成）。

## Scenarios

- S1: 打开 P1-001 task card，能够一眼看到 Issue/PR/RUN_LOG，并且验收项全为 `[x]`。
- S2: 打开 P1-002 task card，能够一眼看到 Issue/PR/RUN_LOG，并且验收项全为 `[x]`。
- S3: 打开 `writenow-spec/spec.md`，Write Mode IDE 相关进度已反映 P1-001/002 完成，且链接指向 #292/#295 或 RUN_LOG。

