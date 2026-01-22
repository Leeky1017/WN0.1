# 002: PoC — Theia backend + better-sqlite3 + sqlite-vec

## Context

WriteNow 的全文搜索与语义搜索依赖 SQLite（`better-sqlite3`）与向量扩展（`sqlite-vec`）。迁移到 Theia 后，backend 仍是 Node，但分发/打包方式与 native 模块加载路径会变化；必须先验证“能否加载 + 能否查询 + 能否打包”。

## Requirements

- 在 Theia backend 中加载 `better-sqlite3` 并完成最小 CRUD（建表/插入/查询）。
- 在 Theia backend 中加载 `sqlite-vec` 并完成最小向量表（`vec0`）写入与查询。
- 验证跨平台打包关键风险点（至少：开发态可用、构建态可用的路径与限制），形成 PoC 结论记录。

## Acceptance Criteria

- [ ] PoC 在 Theia backend 启动时成功加载 `better-sqlite3`，可创建数据库文件并执行基本 SQL。
- [ ] 成功加载 `sqlite-vec` 扩展并创建 `vec0` 表，能插入向量并完成一次查询（TopK 或 distance 过滤）。
- [ ] 失败路径可观测：加载失败时有明确错误信息与定位线索（不是 silent failure）。
- [ ] 输出 PoC 记录：结论（可行/不可行/有条件可行）、限制（平台/打包/CPU）、以及对后续任务的影响（是否需要替代方案）。

## Dependencies

- 无（P0 起点）

## Estimated Effort

- M（2–3 天；若涉及打包验证与 native 二进制问题，可能上升到 L）

