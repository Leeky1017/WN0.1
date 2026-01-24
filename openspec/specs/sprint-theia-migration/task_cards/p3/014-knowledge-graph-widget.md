# 014: Knowledge Graph Widget（迁移面板，复用现有实现）

Status: done  
Issue: #159  
PR: <fill-after-created>  
RUN_LOG: openspec/_ops/task_runs/ISSUE-159.md

## Context

本 Sprint 的范围不包含知识图谱“可视化重写”，但迁移到 Theia 后仍需要把现有知识图谱能力以 Widget 形式接入新的壳体与数据层，保证能力不丢失且后续可演进。

## Requirements

- 将现有知识图谱面板以 Theia Widget 形式迁移（复用既有实现/渲染逻辑，避免重写）。
- 通过 Theia RPC 接入所需的数据读取接口（基于 SQLite/索引器现有数据）。
- 确保面板在新布局中可打开/关闭/刷新，并具备最小可用的错误提示。

## Acceptance Criteria

- [x] Theia 中可打开知识图谱面板并显示实体/关系图谱，不崩溃。
- [x] 数据加载失败可观测：有明确错误提示与重试入口。
- [x] 迁移不引入第二套实现：复用既有 SVG 布局/交互逻辑，仅做接线与壳体适配。

## Dependencies

- `007`
- `009`
- `010`（若图谱依赖索引数据）

## Estimated Effort

- M（2–3 天）
