# 任务 004: 知识图谱数据库设计

## 目标

建立知识图谱的最小数据库 Schema 与 IPC 接口：支持项目级实体（人物/地点/事件/时间点/物品）与关系（边）的创建、查询、更新与删除，为可视化与后续一致性检查提供稳定的数据底座。

## 依赖

- 任务 001：项目/文件夹结构（图谱数据必须绑定 project_id）
- 本地数据库能力（SQLite / better-sqlite3）

## 实现步骤

1. 定义实体与关系的数据模型（推荐两表）：
   - `kg_entities`：`id, project_id, type, name, description, metadata_json, created_at, updated_at`
   - `kg_relations`：`id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at`
2. 约束与索引（最小集合）：
   - `project_id` 索引（按项目加载）
   - `from_entity_id/to_entity_id` 索引（按实体查邻接）
   - 外键策略：删除实体时级联删除其关系（或软删，需统一策略）
3. 与人物卡的关系（两选一，Sprint 5 选其一落地即可）：
   - A. 复制映射：人物卡创建时同步生成一个 `kg_entities(type='Character')`
   - B. 引用指针：`kg_entities` 支持 `source_type/source_id` 指向 `characters(id)`（推荐，减少双写）
4. IPC 设计（主进程代理）：
   - `kg:entity:list` / `kg:entity:create` / `kg:entity:update` / `kg:entity:delete`
   - `kg:relation:list` / `kg:relation:create` / `kg:relation:delete`
5. 数据访问接口（为 UI 提供）：
   - 按 project_id 拉取全图（nodes + edges）
   - 按 entity_id 拉取详情与邻接关系

## 新增/修改文件

- `electron/ipc/knowledgeGraph.cjs` - 图谱 CRUD IPC（新增）
- `electron/ipc/database.cjs` - `kg_entities/kg_relations` 表与迁移（修改）
- `src/lib/knowledgeGraph/*`（可选）- 前端数据结构与映射工具（新增）

## 验收标准

- [ ] 数据库存在知识图谱相关表（或等价结构），支持实体与关系持久化
- [ ] 支持按 `project_id` 拉取 nodes + edges
- [ ] 支持创建实体与关系，并可查询某实体的入边/出边
- [ ] 删除策略明确（删除实体时关系不悬挂）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 282-312 行（知识图谱：实体类型/关系类型/技术方案）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 775-812 行（数据库 Schema 风格 + project_id 归属）

