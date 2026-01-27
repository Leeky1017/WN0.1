# 项目知识图谱设计（人物/事件/时序）

> 本 Sprint：**设计先行**（固定数据模型与最小接口），实现可在后续 Sprint 落地。

## 目标

1. 支持“一致性检查”类 SKILL：发现人物关系、时间线、设定前后矛盾
2. 支持时序查询：例如“第三章之前张三是否知道秘密？”
3. 支持证据引用：返回结论必须附带来源（文件/段落/事件）

## 数据模型（实体-关系）

### 核心实体

- **Character**：人物（属性：姓名、别名、性格、口头禅、动机、状态）
- **Scene**：场景（章节/段落范围、地点、参与人物）
- **Event**：事件（发生时间点、影响状态、涉及人物）
- **Location**：地点（层级：城市/建筑/房间等）
- **TimePoint**：时间点/区间（可模糊：`Chapter 3`, `Day 12`, `before-event-X`）

### 关系示例

```
Character ──[FRIEND_OF]──> Character
Character ──[APPEARS_IN]──> Scene
Scene      ──[HAPPENS_AT]──> TimePoint
Event      ──[INVOLVES]──> Character
Event      ──[OCCURS_IN]──> Scene
```

## 时序（Temporal）

时序是写作一致性检查的关键。建议把“时间”拆成两类：

1. **显式时间**：文本中明确出现（日期/章节/“第二天早上”）
2. **相对时间**：依赖事件顺序（before/after）

最小可用方案（建议）：

- `TimePoint` 允许存储 `type: explicit|relative`
- relative time 通过 `before_event_id/after_event_id` 表达
- 一致性检查优先做“矛盾检测”，不追求完全时间推理

## 存储与演进路径

### V0（最小）：JSON 文件 + 轻量索引

- 每个项目一个图谱文件（例如 `.writenow/knowledge-graph.json`）
- 适合快速落地与可读性

### V1：SQLite 关系表（推荐）

优点：查询方便、增量更新、可与全文索引/向量索引共存。

建议表（示意）：

- `kg_entities(id, project_id, type, name, data_json, updated_at)`
- `kg_edges(id, project_id, from_id, to_id, type, data_json, created_at)`
- `kg_evidence(id, project_id, entity_or_edge_id, source_uri, range_json, excerpt, created_at)`

### V2：时序增强（可选）

- 增加 `valid_from/valid_to`（人物状态随时间变化）
- 支持更强的“状态演进”查询

## 最小接口（建议）

> 接口命名必须遵循 `api-contract`（`domain:action`），返回 `IpcResponse<T>`。

- `knowledgeGraph:query`：按实体/关系/时间条件查询
- `knowledgeGraph:upsertEvidence`：写入证据引用
- `knowledgeGraph:detectConflicts`：返回潜在矛盾列表（带证据）

## 与 RAG / Context 工程的协作

- 图谱不替代 RAG：图谱提供结构化关系与时序，RAG 提供原文证据检索
- 一致性检查建议流程：
  1. 从图谱得出“需要核对”的候选冲突点
  2. 使用 RAG/全文检索定位证据段落
  3. 将证据引用写回图谱（可审计）

