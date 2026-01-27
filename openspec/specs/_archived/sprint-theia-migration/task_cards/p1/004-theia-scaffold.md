# 004: Theia Scaffold（最小应用壳体）

Status: done  
Issue: #117  
PR: https://github.com/Leeky1017/WN0.1/pull/118  
RUN_LOG: openspec/_ops/task_runs/ISSUE-117.md

## Context

迁移必须先建立一个可运行、可扩展、可裁剪的 Theia 应用壳体，作为后续 Widget 与 backend services 的承载基座。该壳体必须可被 CI/E2E 驱动，并具备清晰的 build/run 入口。

## Requirements

- 使用 `generator-theia-extension` 初始化最小 Theia 应用（frontend + backend）。
- 明确工程结构（packages、extension、frontend/backend contribution 边界）。
- 提供可复现的启动命令（dev/build），并记录到 README/Run log。

## Acceptance Criteria

- [x] 本地可一键启动 Theia 应用壳体（dev mode），并能加载自定义扩展（至少输出一条可验证日志或 UI 标识）。
- [x] 项目结构清晰：frontend 与 backend 扩展代码位置明确，且后续任务不需要“再换脚手架”。
- [x] 关键命令（install/build/start）被记录，并能在干净环境复现。

## Dependencies

- `001`/`002`/`003` 建议先完成（但 scaffold 可与 PoC 并行推进）

## Estimated Effort

- S（0.5–1 天）
