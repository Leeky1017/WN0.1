# 009: SQLite Migration（初始化 + schema + 路径）

Status: done  
Issue: #146  
PR: https://github.com/Leeky1017/WN0.1/pull/147  
RUN_LOG: openspec/_ops/task_runs/ISSUE-146.md

## Context

SQLite 是 WriteNow 的本地持久化基石（projects/articles/version history/settings 等）。迁移到 Theia backend 后，必须先把 DB 初始化与 schema 迁移稳定下来，才能承载后续 RAG/Embedding/历史版本等能力。

## Requirements

- 在 Theia backend 中建立 SQLite 初始化与 schema 迁移入口（复用现有 schema 定义）。
- 明确 DB 文件路径（受 `storage-model` 决策影响），并确保可定位/可备份/可恢复。
- 将最小业务链路跑通（例如：创建项目 → 写入 DB → 重启仍可读）。

## Acceptance Criteria

- [x] Theia backend 启动后可初始化 DB（含 schema），且不会重复建表/破坏数据。
- [x] DB 路径策略明确并写入文档；E2E/本地运行可通过配置隔离数据目录。
- [x] 至少一个真实业务链路通过 DB 验证持久化（重启后仍可读）。

## Dependencies

- `002`
- `003`
- `008`

## Estimated Effort

- M（2–3 天）
