# 04 - Graphiti 知识图谱评估

本设计文档定义 **Graphiti（Zep）评估**的目标、边界与验证方法；并明确“先 SQLite 图模拟、后重依赖”的渐进路线。

---

## 背景：WriteNow 已有本地知识图谱（SQLite）

WriteNow 当前使用 SQLite 维护项目级知识图谱：实体与关系表。

**Schema（摘录）**：`writenow-theia/writenow-core/src/node/database/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS kg_entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kg_relations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**现有能力入口（示例）**：
- IPC handler：`electron/ipc/knowledgeGraph.cjs`（`kg:*`）
- Theia service：`writenow-theia/writenow-core/src/node/services/knowledge-graph-service.ts`

---

## 评估目标（What / Why）

Graphiti 的核心卖点是：
- **时序感知**：同一事实在不同时间段可能不同，检索需考虑“有效期”。
- **混合检索**：语义 + 关键词 + 图遍历组合。
- **更好的召回/准确率/延迟**：在“角色关系、事件链、设定一致性”类检索场景更有优势。

WriteNow 需要回答的问题：
1) 现有 SQLite 图模型能否满足核心写作场景？缺口是什么？
2) Graphiti 引入后（通常伴随 Neo4j），对桌面产品的**运维/体积/启动复杂度**是否可接受？
3) 如果必须引入外部进程/数据库，是否违背“本地优先”的原则？

---

## 评估路线：B 方案先行（SQLite 图模拟）

> 决策原则：**先验证需求，再引入重依赖**。

### Option B（推荐先做）：SQLite 图模拟

目标：用现有 `kg_entities/kg_relations` + 少量扩展字段，模拟“episode / time”概念，验证“写作一致性检索”的价值。

**可行做法**：
- 在 `metadata_json` 中引入 `valid_from/valid_to/source` 等字段（不改 schema 也可）。
- 用 SQL 完成：
  - 实体模糊搜索（name/description）
  - 关系扩展（1 跳/2 跳）
  - 基于 `valid_from/valid_to` 的过滤（时序模拟）

示例查询（伪代码）：

```sql
-- 1) 找到与“李四”相关的实体
SELECT id, type, name, description
FROM kg_entities
WHERE project_id = ?
  AND (name LIKE '%' || ? || '%' OR description LIKE '%' || ? || '%')
LIMIT 20;

-- 2) 取 1-hop 关系
SELECT r.type, e1.name AS from_name, e2.name AS to_name, r.metadata_json
FROM kg_relations r
JOIN kg_entities e1 ON e1.id = r.from_entity_id
JOIN kg_entities e2 ON e2.id = r.to_entity_id
WHERE r.project_id = ?
  AND (r.from_entity_id = ? OR r.to_entity_id = ?);
```

### Option A：Graphiti + 本地 Neo4j

目标：对齐 Graphiti 的完整能力（图数据库 + episode/time + 混合检索）。

风险：
- 需要额外进程（Neo4j）与更大安装体积
- 桌面端启动/升级/迁移复杂

### Option C：Graphiti + 托管服务

不推荐作为默认路径（桌面“本地优先”冲突），但可在“团队协作/云同步”阶段再评估。

---

## 评估用例（必须可复现）

评估必须围绕真实写作场景，至少包含：

1) **人物关系一致性**
- Query：`“张三和李四是什么关系？什么时候认识的？”`
- 期望：输出关系链 + 时间线 + 引用来源。

2) **设定冲突检测**
- Query：`“第二章说王五 28 岁，第四章说 35 岁，哪个正确？”`
- 期望：返回两个事实节点 + 对应有效期/来源 + 建议修正。

3) **事件链检索**
- Query：`“第三章之后发生了哪些关键事件？按时间排序。”`
- 期望：输出事件序列。

---

## 架构图（评估阶段）

```
┌──────────────────────────────┐
│ Renderer                      │
│ - Ask: KG query / consistency │
└───────────────┬──────────────┘
                │ invoke('kg:*') / service call
                ▼
┌───────────────────────────────────────────────────────┐
│ Backend KG facade                                      │
│ - v1: SQLite graph simulation (kg_entities/relations)   │
│ - v2: Graphiti adapter (optional)                       │
└───────────────┬───────────────────────────────────────┘
                │
      ┌─────────┴─────────┐
      ▼                   ▼
┌───────────────┐   ┌──────────────────┐
│ SQLite         │   │ Graphiti + Neo4j │
│ (default)      │   │ (evaluation)     │
└───────────────┘   └──────────────────┘
```

---

## 验收产物（Deliverables）

评估完成必须产出：

1) `evidence/graphiti-eval.md`（或等价 Run log 附录）
- 数据集描述（项目样本、文本来源、规模）
- 指标：准确率（人工标注）、延迟（P50/P95）、资源占用
- 结论：是否引入 Graphiti/Neo4j，或继续 SQLite

2) 若决定引入 Graphiti：
- 依赖清单（Neo4j/Graphiti runtime）
- 桌面端分发策略（安装包大小、升级、迁移、卸载）
- “可选开关”与默认路径（不得双栈并存）
