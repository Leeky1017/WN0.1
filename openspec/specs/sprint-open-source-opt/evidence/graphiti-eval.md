# Graphiti 评估报告（P2-002）

## Verdict
- Status: **NO-GO（作为桌面端默认依赖）**
- Recommendation:
  - **默认路径**继续使用现有 SQLite KG（`kg_entities/kg_relations`），并按需补齐“搜索 + hop 扩展 + 时序过滤”能力（本次 PoC 已验证可行）。
  - Graphiti **仅建议**作为未来“可选外置服务 / 团队协作版 / 云服务阶段”的候选（需要 Python + 图数据库等额外运行时与运维成本）。

## Scope
- 目标：回答 Graphiti 是否能显著提升“关系检索 / 时序事实 / 一致性检查”，以及其依赖（Neo4j 等）对桌面端分发的影响。
- 非目标：本次不把 Graphiti 直接集成为 WriteNow 默认链路（避免双栈并存与重依赖引入）。

## Reference（外部资料）
- Graphiti GitHub README（安装依赖、特性、Quick Start）：
  - `https://github.com/getzep/graphiti`
- Zep Graphiti 文档（Quick Start / Graph DB 配置 / Neo4j 配置）：
  - `https://help.getzep.com/graphiti/graphiti/installation`
  - `https://help.getzep.com/graphiti/configuration/graph-db-configuration`
  - `https://help.getzep.com/graphiti/configuration/neo-4-j-configuration`

## Current baseline（WriteNow 现状）
- SQLite KG 表：`writenow-theia/writenow-core/src/node/database/schema.sql`
  - `kg_entities(id, project_id, type, name, description, metadata_json, ...)`
  - `kg_relations(id, project_id, from_entity_id, to_entity_id, type, metadata_json, ...)`
- 现有能力入口：
  - IPC（Electron 侧 CRUD）：`electron/ipc/knowledgeGraph.cjs`
  - Theia service（CRUD）：`writenow-theia/writenow-core/src/node/services/knowledge-graph-service.ts`
- 结论：目前具备 CRUD/列表，但缺少可复现的“检索与时序一致性”基准。

## SQLite 图模拟 PoC（Option B, 推荐先行）

### Data set
- 文件：
  - 数据集（稳定）：`writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.dataset.json`
- 规模（本次 PoC）：
  - entities: 11
  - relations: 11
- 覆盖类型：人物（Character）/地点（Location）/事件（Event）/事实（Fact）
- 时序字段：通过 `metadata_json.valid_from/valid_to/source` 模拟“有效期 + 来源”。

### How to run (reproducible)
```bash
# deps
npm run theia:install

# run poc
node writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.cjs
```

### Results
运行输出（完整 stdout 已记录到 RUN_LOG 中；此处摘录关键结论）：

- **用例 1：人物关系一致性**
  - 张三 ↔ 李四：关系在时间线上可表达为 `KNOWS → RIVALS`（基于 valid window）。
- **用例 2：设定冲突检测**
  - 王五年龄出现 `28（chapter-2）` 与 `35（chapter-4）` 两个事实；按时间点过滤可得到当前“有效事实”。
- **用例 3：事件链检索**
  - 可按 `metadata.chapterIndex/occurred_at` 对第三章后的事件排序输出。

### Metrics（基准）
环境与基准（WSL2, Node v20.19.6, SQLite 3.51.2）：

- 延迟（ms, 1500 iterations）：
  - entitySearch: P50≈0.0280, P95≈0.0670
  - expand(1-hop): P50≈0.0365, P95≈0.0767
  - expand(2-hop): P50≈0.0791, P95≈0.1741
- 资源快照（本机单次运行）：
  - RSS ≈ 89.6 MB
  - DB size ≈ 224 KB（临时 SQLite 文件）

### What this PoC proves / doesn’t prove
- ✅ 证明：在现有表结构下，“实体搜索 + hop 扩展 + 时序过滤 + 冲突呈现”可用纯 SQLite 实现，且查询延迟极低（小规模数据）。
- ❌ 未证明：
  - 从真实长文本自动抽取事实/关系的稳定性（这属于 Graphiti 的核心能力之一，涉及 Structured Output 与抽取策略）。
  - 大规模图（10^5+ 节点/边）下的延迟与索引策略（需要下一阶段用真实项目样本与规模化数据再评估）。

## Graphiti 评估（Option A）

### What Graphiti gives us（对齐需求点）
根据 Graphiti README（`https://github.com/getzep/graphiti`）：
- **Bi-Temporal / temporal-aware**：支持历史查询与关系变更（有效期、冲突处理思路）。
- **Hybrid retrieval**：语义 embedding + BM25 + 图遍历融合（更贴近“写作一致性检索”）。
- **Episode ingestion**：以 episode 为单位持续增量构建图谱（适配持续写作过程）。

### Hard dependencies / operational cost
Graphiti Quick Start / DB 配置文档明确（示例）：
- 运行前置：**Python 3.10+**（`pip install graphiti-core`）
- 图数据库后端：
  - **Neo4j 5.26+ 为 primary backend**（文档明确）：
    - `https://help.getzep.com/graphiti/configuration/graph-db-configuration`
    - `https://help.getzep.com/graphiti/configuration/neo-4-j-configuration`
  - 也支持 FalkorDB / Kuzu / Neptune（但依然需要 Graphiti Python runtime）
- 默认依赖外部 LLM/Embedding 服务（Graphiti 默认 OpenAI，并建议使用支持 Structured Output 的服务）。

对桌面端（WriteNow）影响：
- **体积与分发**：Neo4j（JVM）+ Python 生态会显著增加安装体积与跨平台打包复杂度。
- **启动与运维**：需要额外进程/端口/凭据配置；升级/迁移/崩溃恢复路径复杂。
- **单机隐私与权限**：若默认引入外部服务（LLM/Embedding）与图数据库，需更严格的配置与提示（本 Sprint 不建议作为默认路径）。

### Compatibility with “单链路”原则
如果未来要引入 Graphiti：
- 必须以 **显式开关** 形式存在，且“启用后只有一条请求链路”（不能在同一次请求里尝试 SQLite+Graphiti 双路径）。
- 更可行的形态是 **外置 Graphiti 服务**（可选/Dev/Power user），WriteNow 通过 IPC/HTTP 调用并提供可观测性与失败语义。

## Recommendation & Follow-ups
1) **短期（本 Sprint）**：保持 SQLite KG 为默认；将 `valid_from/valid_to/source` 作为推荐元数据约定（不强制 schema 变更）。
2) **中期**：补齐“真实项目样本”评估：用 1 个实际写作项目（人物/地点/事件/时间点）抽取后导入，测试：
   - 查询准确率（人工标注）
   - 大规模性能（节点/边增长）
3) **Graphiti 方向**（若未来仍需）：
   - 先以外置服务验证（Docker Compose + Neo4j），跑通 episode ingestion + search（并记录资源占用与运维步骤）。
   - 再评估是否存在更贴合桌面的运行方式（例如 Kuzu 作为嵌入式后端 + 独立服务进程；仍需解决 Python runtime 分发）。

