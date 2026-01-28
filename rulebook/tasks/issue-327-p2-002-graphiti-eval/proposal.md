# Proposal: issue-327-p2-002-graphiti-eval

## Why
Sprint `openspec/specs/sprint-open-source-opt/spec.md` 要求对 Graphiti（Zep）进行可行性评估，并坚持“先验证需求，再引入重依赖”的路线。当前 WriteNow 已有 SQLite 版知识图谱（`kg_entities/kg_relations`），但缺少对“关系检索/时序事实/一致性检查”的可复现评估与基准，因此需要补齐 PoC 与评估报告以支撑后续是否引入 Graphiti/Neo4j 的决策。

## What Changes
- 新增可复现的 SQLite 图模拟 PoC：包含样例数据、实体检索、1-hop/2-hop 扩展、基于 `metadata_json.valid_from/valid_to` 的时序过滤与基准延迟统计。
- 新增 Graphiti 评估报告：梳理 Graphiti 能力、依赖（是否硬需 Neo4j）、以及对桌面端分发/运维/启动复杂度的影响与缓解策略。
- 更新对应 task card 的验收勾选与完成元信息（Issue/PR/RUN_LOG）。

## Impact
- Affected specs: `openspec/specs/sprint-open-source-opt/task_cards/p2/P2-002-graphiti-eval.md`
- Affected code: `rulebook/tasks/issue-327-p2-002-graphiti-eval/evidence/**`（评估报告 + PoC）
- Breaking change: NO
- User benefit: 在不引入 Neo4j 等重依赖之前，以最小成本验证“写作一致性检索”价值，并提供明确的技术决策依据与风险清单。
