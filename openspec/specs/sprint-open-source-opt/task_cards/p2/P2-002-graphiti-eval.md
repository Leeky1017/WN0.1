# P2-002: 评估 Graphiti 知识图谱集成（SQLite 图模拟先行）

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-002 |
| Phase | 2 - 知识图谱评估 |
| 优先级 | P1 |
| 状态 | Todo |
| 依赖 | 无（基于现有 SQLite KG） |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-open-source-opt/spec.md`
- [ ] `openspec/specs/sprint-open-source-opt/design/04-graphiti-evaluation.md`
- [ ] `writenow-theia/writenow-core/src/node/database/schema.sql`（kg_entities/kg_relations）

## 目标

- 明确 Graphiti 是否能显著提升“关系检索/时序事实/一致性检查”的效果。
- 在不引入重依赖（Neo4j）之前，先用 SQLite 图模拟验证需求价值。

## 任务清单

- [ ] 定义评估数据集（至少 1 个真实项目样本；包含人物/地点/事件/时间点）。
- [ ] SQLite 图模拟 PoC：
  - [ ] 实体检索（name/description）
  - [ ] 关系扩展（1-hop/2-hop）
  - [ ] 时序字段模拟（metadata_json）
- [ ] Graphiti PoC（可选，视评估环境）：
  - [ ] 以最小成本跑通 Graphiti 插入 episode + 查询
  - [ ] 明确依赖：Neo4j/运行方式/资源占用
- [ ] 指标与对比：
  - [ ] 准确率（人工标注）
  - [ ] 延迟（P50/P95）
  - [ ] 资源占用（CPU/RAM/磁盘）
- [ ] 输出结论：是否引入 Graphiti；若引入，提供桌面端分发与开关方案（单链路）。

## 验收标准

- [ ] 产出一份可复现评估报告（包含数据集描述、指标与结论）。
- [ ] 明确是否需要 Neo4j 作为硬依赖，以及其对桌面产品的影响与缓解策略。

## 产出

- 报告：`evidence/graphiti-eval.md`（或同等可追溯文档）。
- 若决定引入：Graphiti 集成方案草案（依赖清单 + 分发策略 + feature flag）。
