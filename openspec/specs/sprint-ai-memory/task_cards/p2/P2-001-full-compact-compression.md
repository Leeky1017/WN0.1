# P2-001: 历史结果 Full → Compact 压缩（长会话）

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-001 |
| Phase | 2 - 长会话支撑 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P0-002 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/design/01-memory-layers.md`（Layer 4 定义）
- [ ] `electron/ipc/context.cjs`（现有 summary/analysis 结构）

## 目标

支持将历史对话/运行结果从 Full 形态压缩为 Compact 摘要，控制 token 成本并支撑长项目连续改写；同时保留回溯 Full 的路径引用（可审计）。

## 任务清单

- [ ] 定义 Full 与 Compact 的存储结构（SQLite + 文件引用）
- [ ] 实现 compaction 触发条件（按 token 估算/条目数/时间）
- [ ] 生成 Compact 摘要（结构化、可确定性序列化）
- [ ] 注入策略：默认注入 Compact；Full 仅在按需查看/回溯时加载
- [ ] 增加 E2E：构造长历史项目 → 多次运行 SKILL → 触发 compaction → 验证仍可继续运行且引用可追溯

## 验收标准

- [ ] Compact 摘要稳定可复现（相同输入生成相同序列化结果）
- [ ] compaction 不会导致上下文链路卡死（取消/超时可恢复）
- [ ] 可回溯：Compact 记录包含 Full 的引用（文件路径/条目 ID）
- [ ] E2E 通过并写入 RUN_LOG 证据

## 产出

- Full/Compact 数据模型与 compaction 实现
- 注入策略与回溯路径
- E2E 覆盖与证据

