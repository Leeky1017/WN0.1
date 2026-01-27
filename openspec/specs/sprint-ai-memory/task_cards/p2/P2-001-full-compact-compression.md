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

## 可观测信号 / 验证方式

- compaction 触发必须可观测：
  - 产生明确的“压缩事件”记录（阈值、触发原因、影响范围）
  - Compact 摘要包含 `summaryQuality`（或等价质量标记）与来源引用
- 回溯必须可验证：
  - Compact 记录包含 project-relative 引用（不得输出绝对路径）
  - 能通过引用定位到 Full 内容（文件或 DB 条目）

## E2E 场景（建议步骤）

- [ ] 构造长历史：连续运行多次 SKILL 生成足够多的历史记录
- [ ] 触发 compaction（通过阈值或强制入口）
- [ ] 断言：Compact 摘要生成且被后续注入使用（可通过 injected.refs 或调试视图确认）
- [ ] 通过引用回溯到 Full 内容并验证一致性

## 产出

- Full/Compact 数据模型与 compaction 实现
- 注入策略与回溯路径
- E2E 覆盖与证据
