# 任务 003: 大纲视图组件

## 目标

提供可用的大纲视图组件，用结构化方式呈现文章走向，并实现最小编辑闭环（新增/重命名/调整顺序）与持久化，为后续 `context:get_outline`、续写/扩写等 SKILL 提供稳定的数据来源。

## 依赖

- Sprint 1：编辑器（能定位到章节/标题）与文件/文章读写闭环
- 任务 001：项目上下文（大纲数据必须绑定 project/article）

## 实现步骤

1. 明确大纲归属与存储策略（Sprint 5 选其一落地即可）：
   - A. 文章级 JSON：将 outline 存储为 `articles` 的 JSON 字段（需要 schema 迁移）
   - B. 独立表：新增 `outlines/outline_nodes`（或单表 JSON）以支持层级结构（推荐，便于扩展）
2. Outline 数据结构（最小集合）：
   - 节点：`id/title/level/order/summary(optional)/status(optional)`
   - 层级：通过 `parent_id` 或 `path` 表达
3. UI 组件：
   - 展示树状或分层列表（必须体现层级）
   - 选择节点 → 编辑器定位到对应标题（或最近标题）
4. 最小编辑能力：
   - 新增节点、重命名、拖拽排序（若拖拽超范围，可先实现按钮上移/下移）
   - 保存状态提示（saving/saved/error）
5. IPC / store：
   - `outline:get`（按 article_id）
   - `outline:save`（全量保存或增量更新均可）

## 新增/修改文件

- `electron/ipc/outline.cjs` - 大纲读取/保存 IPC（新增）
- `electron/ipc/database.cjs` - 大纲相关表/字段迁移（修改）
- `src/stores/outlineStore.ts` - 大纲状态（新增）
- `src/components/Outline/*` - 大纲视图组件（新增）

## 验收标准

- [ ] 大纲视图可展示当前文章的大纲结构（体现层级）
- [ ] 点击大纲节点可定位到编辑器对应位置（最少：定位到最近标题）
- [ ] 支持新增/重命名/调整顺序（最小集合）并可持久化
- [ ] 重启后大纲可恢复；数据按 project/article 隔离

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 100-103 行（文章级上下文包含大纲）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 120-123 行（扩写/续写依赖大纲位置/后续要点）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 132 行（Tool: context:get_outline）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 884-889 行（Sprint 5 范围：大纲视图）

