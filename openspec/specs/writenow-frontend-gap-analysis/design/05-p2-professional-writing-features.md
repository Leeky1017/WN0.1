# Design：P2/P3 专业写作能力（索引维护 / Corkboard / 写作目标 / 时间线）

## 目标

在不破坏 Write Mode SSOT 的前提下，增量引入 Scrivener 级的“结构化写作”能力，并尽量复用既有存储与通道，避免引入新的后端复杂度。

## 5.1 索引维护（手动重建索引）

### Why

语义搜索依赖 embedding 与索引。用户需要一个“明确的修复入口”，而不是只看到 `MODEL_NOT_READY/DB_ERROR`。

### 最小方案

- Settings 增加“索引管理”区块（或 Search 面板增加入口）
- 点击“重建索引”：
  - 调用 `embedding:index`
  - 进度/结果至少展示 `indexedCount`

> 若现有 `embedding:index` 仅支持传入 items（而非“全量重建”），则任务卡必须补齐：如何枚举项目文档并组装 items，且确保不会卡死（分页/限流）。

## 5.2 Corkboard（索引卡）

### 复用策略（优先）

复用 Outline 作为权威结构：

- 卡片 = `OutlineNode`（`title` + `summary` + `status`）
- 拖拽重排 = 更新 OutlineNode 顺序并调用 `outline:save`
- Corkboard 是 Outline 的“视图层”，不引入第二份结构化数据（避免双栈漂移）

### 最小信息架构

- 顶部：过滤（按 status）+ 排序（按 level/自定义顺序）
- 主体：卡片网格（固定宽度卡片，展示 title + summary）
- 交互：拖拽重排（至少同层级）；点击卡片跳转到正文对应标题

## 5.3 写作目标系统（项目/每日目标）

### 最小方案（优先）

先做前端本地持久化（localStorage 或现有 settings store），形成可用闭环：

- 每日目标：默认 2000 字，可在 Settings 配置
- 进度：复用已有今日字数（`stats:getToday` 或本地 wordCount fallback）
- 展示位置：StatsBar Popover + Settings

> 后续若需要跨设备同步，再考虑落到后端 settings；本阶段不引入云同步。

## 5.4 时间线视图（P3）

### 现实约束

时间线属于“新数据模型”。若现有通道无法写入 `.writenow/` 设定文件，则需要新增 IPC 通道（必须遵循 `api-contract` + contract automation）。

### 最小可用形态（先定义验收口径）

- 事件字段：`when`（时间/相对时间）、`title`、`note`、`refs`（关联文档/章节）
- 能力：新增/编辑/删除/排序；可按时间过滤
- 证据引用：refs 必须是 project-relative（不得泄露绝对路径）

